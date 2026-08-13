const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code || null;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  games: () => request('/api/games'),
  // roomId is optional — pass it to "revive" a specific code (e.g. from
  // past-rooms history) instead of getting a fresh random one.
  createRoom: (name, color, roomId) =>
    request('/api/rooms', { method: 'POST', body: JSON.stringify({ name, color, roomId }) }),
  getRoom: (roomId) => request(`/api/rooms/${roomId}`),
  joinRoom: (roomId, { name, color, userId }) =>
    request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ name, color, userId }),
    }),
};

export const BACKEND_URL = BASE;
