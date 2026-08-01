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
