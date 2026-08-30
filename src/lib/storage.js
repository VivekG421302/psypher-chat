// ─────────────────────────────────────────────────────────────────────────────
// storage.js  —  rooms are PERMANENT; never auto-deleted
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE_KEY = 'psypher.profile';
const ROOMS_KEY   = 'psypher.rooms';
const DEVICE_KEY  = 'psypher.deviceId';

// ── Profile ───────────────────────────────────────────────────────────────────
export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? null; }
  catch { return null; }
}
export function saveProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
export function clearProfile() { localStorage.removeItem(PROFILE_KEY); }

// ── Device ID ─────────────────────────────────────────────────────────────────
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
  return id;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function loadRooms() {
  try { return JSON.parse(localStorage.getItem(ROOMS_KEY)) ?? {}; }
  catch { return {}; }
}

function saveRooms(rooms) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

// ── Core ──────────────────────────────────────────────────────────────────────
/**
 * Upsert a room.  Existing pinned / label / joinedAt are NEVER overwritten.
 * Only pass the fields that genuinely changed (e.g. { userId, name }).
 */
export function rememberRoom(roomId, data = {}) {
  const rooms    = loadRooms();
  const existing = rooms[roomId] ?? {};

  // Only merge fields that are explicitly provided and not undefined
  const patch = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) patch[k] = v;
  }

  rooms[roomId] = {
    ...existing,           // keep everything already stored
    ...patch,              // apply only the new/changed fields
    roomId,                // always present
    joinedAt:   existing.joinedAt  ?? Date.now(),   // set once
    lastActive: Date.now(),                          // always bump
    pinned:     existing.pinned    ?? false,         // never clear
    label:      existing.label     ?? patch.label ?? roomId, // never clear
  };

  saveRooms(rooms);
  idbPut(rooms[roomId]);   // async backup
  return rooms[roomId];
}

export function forgetRoom(roomId) {
  const rooms = loadRooms();
  delete rooms[roomId];
  saveRooms(rooms);
  idbDelete(roomId);
}

export function getRememberedRoom(roomId) {
  return loadRooms()[roomId] ?? null;
}

export function touchRoom(roomId) {
  const rooms = loadRooms();
  if (!rooms[roomId]) return;
  rooms[roomId].lastActive = Date.now();
  saveRooms(rooms);
  idbPut(rooms[roomId]);
}

export function updateRoomLabel(roomId, label) {
  const rooms = loadRooms();
  if (!rooms[roomId]) return;
  rooms[roomId].label      = label;
  rooms[roomId].lastActive = Date.now();
  saveRooms(rooms);
  idbPut(rooms[roomId]);
}

export function listPastRooms() {
  return Object.values(loadRooms())
    .filter(r => r && typeof r.roomId === 'string')   // drop malformed entries
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return  1;
      return (b.lastActive ?? b.joinedAt ?? 0) - (a.lastActive ?? a.joinedAt ?? 0);
    });
}

// ── IndexedDB backup ──────────────────────────────────────────────────────────
const IDB_NAME    = 'psypher';
const IDB_VERSION = 1;
const IDB_STORE   = 'rooms';

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE, { keyPath: 'roomId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(record) {
  try {
    const db = await openIdb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ ...record }); // shallow clone to avoid proxy issues
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    console.warn('[psypher/storage] IDB write failed:', e);
  }
}

async function idbDelete(roomId) {
  try {
    const db = await openIdb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
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
    return rows;
  } catch { return []; }
}

/**
 * Called once on app start. Merges IDB → localStorage and back-fills IDB
 * with any LS-only rooms so both layers stay in sync.
 */
export async function syncFromIdb() {
  const [idbRows, lsRooms] = await Promise.all([idbGetAll(), Promise.resolve(loadRooms())]);
  let changed = false;

  for (const row of idbRows) {
    const ex = lsRooms[row.roomId];
    if (!ex || (row.lastActive ?? 0) > (ex.lastActive ?? 0)) {
      lsRooms[row.roomId] = row;
      changed = true;
    }
  }
  if (changed) saveRooms(lsRooms);

  // Back-fill IDB with LS-only entries
  const idbSet = new Set(idbRows.map(r => r.roomId));
  for (const room of Object.values(lsRooms)) {
    if (!idbSet.has(room.roomId)) idbPut(room);
  }
}
