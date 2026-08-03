const PROFILE_KEY = 'psypher.profile';
const ROOMS_KEY = 'psypher.rooms';

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

/**
 * A person can be registered in several rooms at once. We keep a small
 * local directory of { roomId -> { userId, joinedAt } } purely so a page
 * refresh can silently rejoin as the same member instead of registering
 * a third, room-breaking identity.
 */
export function loadRooms() {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function rememberRoom(roomId, data) {
  const rooms = loadRooms();
  rooms[roomId] = { ...data, joinedAt: Date.now() };
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export function forgetRoom(roomId) {
  const rooms = loadRooms();
  delete rooms[roomId];
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export function getRememberedRoom(roomId) {
  return loadRooms()[roomId] || null;
}

// ─── Device identity ─────────────────────────────────────────────
// A stable UUID tied to this browser/device. Never changes.
const DEVICE_KEY = 'psypher.deviceId';

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

// ─── Named room history ──────────────────────────────────────────
// Stores { roomId -> { userId, name, joinedAt, lastActive, label } }
// "label" is a human nickname for the room (defaults to the other person's name
// if we learn it, or the roomId itself).

export function updateRoomLabel(roomId, label) {
  const rooms = loadRooms();
  if (rooms[roomId]) {
    rooms[roomId].label = label;
    rooms[roomId].lastActive = Date.now();
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  }
}

export function touchRoom(roomId) {
  const rooms = loadRooms();
  if (rooms[roomId]) {
    rooms[roomId].lastActive = Date.now();
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  }
}

export function listPastRooms() {
  const rooms = loadRooms();
  return Object.entries(rooms)
    .map(([roomId, data]) => ({ roomId, ...data }))
    .sort((a, b) => (b.lastActive || b.joinedAt || 0) - (a.lastActive || a.joinedAt || 0));
}
