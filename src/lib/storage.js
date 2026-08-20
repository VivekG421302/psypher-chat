// ─────────────────────────────────────────────────────────────────────────────
// storage.js
//
// Two-layer persistence so rooms are never silently lost:
//   1. localStorage  – fast, synchronous, primary read path
//   2. IndexedDB     – backup; survives localStorage.clear()
//
// Rooms are NEVER auto-deleted. The only way to remove a room is an explicit
// user action (forgetRoom). joinedAt is set once and never overwritten.
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE_KEY = 'psypher.profile';
const ROOMS_KEY   = 'psypher.rooms';
const DEVICE_KEY  = 'psypher.deviceId';

// ── Profile ───────────────────────────────────────────────────────────────────
export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? null; }
  catch { return null; }
}
export function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}
export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

// ── Device ID ─────────────────────────────────────────────────────────────────
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
  return id;
}

// ── IndexedDB layer ───────────────────────────────────────────────────────────
const IDB_NAME    = 'psypher';
const IDB_VERSION = 1;
const IDB_STORE   = 'rooms';

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: 'roomId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(record) {
  try {
    const db   = await openIdb();
    const tx   = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(record);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch { /* never throw – IDB is best-effort */ }
}

async function idbDelete(roomId) {
  try {
    const db   = await openIdb();
    const tx   = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(roomId);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch { }
}

async function idbGetAll() {
  try {
    const db  = await openIdb();
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    const rows = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
    db.close();
    return rows; // [{ roomId, ...data }]
  } catch { return []; }
}

// ── Core room helpers ─────────────────────────────────────────────────────────

/** Read the localStorage snapshot (fast, sync). */
export function loadRooms() {
  try { return JSON.parse(localStorage.getItem(ROOMS_KEY)) ?? {}; }
  catch { return {}; }
}

/**
 * Save or update a room entry.
 *
 * Rules:
 *  - joinedAt is set ONCE (on first save) and never overwritten.
 *  - Existing fields (pinned, label, etc.) are preserved if not explicitly
 *    provided in `data`.
 *  - Writes to both localStorage AND IndexedDB.
 */
export function rememberRoom(roomId, data) {
  const rooms    = loadRooms();
  const existing = rooms[roomId] ?? {};

  // Strip undefined values from data so they don't overwrite existing fields
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  const updated = {
    // Carry forward everything already stored
    ...existing,
    // Merge in new data (never overwrites with undefined)
    ...cleanData,
    // roomId must always be present (needed by IDB keyPath)
    roomId,
    // joinedAt: set once, never overwritten
    joinedAt: existing.joinedAt ?? Date.now(),
    // lastActive: bump on every save
    lastActive: Date.now(),
    // Preserve pinned — never let a join/update clear it
    pinned: existing.pinned ?? cleanData.pinned ?? false,
    // Preserve label — only set default on very first save
    label: existing.label ?? cleanData.label ?? roomId,
  };

  rooms[roomId] = updated;
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));

  // Async backup to IndexedDB — fire-and-forget
  idbPut(updated);
}

/**
 * Permanently remove a room from both layers.
 * Only call this on explicit user intent (two-click confirm).
 */
export function forgetRoom(roomId) {
  const rooms = loadRooms();
  delete rooms[roomId];
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  idbDelete(roomId);
}

export function getRememberedRoom(roomId) {
  return loadRooms()[roomId] ?? null;
}

export function touchRoom(roomId) {
  const rooms = loadRooms();
  if (!rooms[roomId]) return;
  rooms[roomId].lastActive = Date.now();
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  idbPut(rooms[roomId]);
}

export function updateRoomLabel(roomId, label) {
  const rooms = loadRooms();
  if (!rooms[roomId]) return;
  rooms[roomId].label      = label;
  rooms[roomId].lastActive = Date.now();
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  idbPut(rooms[roomId]);
}

/**
 * Restore from IndexedDB into localStorage.
 * Call once on app startup. Returns the merged room map.
 */
export async function syncFromIdb() {
  const idbRows  = await idbGetAll();
  if (!idbRows.length) return loadRooms();

  const lsRooms  = loadRooms();
  let changed    = false;

  for (const row of idbRows) {
    const { roomId, ...rest } = row;
    const existing = lsRooms[roomId];
    // IDB wins if: entry is missing from LS, or IDB has a newer lastActive
    if (
      !existing ||
      (rest.lastActive ?? 0) > (existing.lastActive ?? 0)
    ) {
      lsRooms[roomId] = { roomId, ...rest };
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(lsRooms));
  }

  return lsRooms;
}

/**
 * Sorted list for the directory.
 * pinned rooms always float to top, then by lastActive desc.
 */
export function listPastRooms() {
  const rooms = loadRooms();
  return Object.values(rooms).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return  1;
    return (b.lastActive ?? b.joinedAt ?? 0) - (a.lastActive ?? a.joinedAt ?? 0);
  });
}
