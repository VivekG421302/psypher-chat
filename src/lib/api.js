// Use env var if set (local dev), otherwise use the deployed Render backend
const BASE = import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://psypher-chat-backend.onrender.com');

// Retry with exponential backoff — handles Render cold starts (30-60s wake time)
async function request(path, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
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
    } catch (err) {
      // Don't retry 4xx errors — only network failures / 5xx
      if (err.status && err.status < 500) throw err;
      if (attempt < retries - 1) {
        // Wait before retry: 1s, 3s, 7s
        await new Promise(r => setTimeout(r, (2 ** attempt - 1) * 1000 + 1000));
        continue;
      }
      throw err;
    }
  }
}

// Warm up the backend on app load (Render free tier sleeps after inactivity)
export function warmBackend() {
  fetch(`${BASE}/api/health`, { method: 'GET' }).catch(() => {});
}

export const api = {
  health: () => request('/api/health'),
  games:  () => request('/api/games'),
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
