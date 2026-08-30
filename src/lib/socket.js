import { io } from 'socket.io-client';
import { BACKEND_URL } from './api.js';

// Each call gets its own Socket.IO connection.
// We do NOT use a singleton because two players in the same browser session
// (e.g. testing with two tabs) must not share a socket — they have different
// userIds and room roles, and a shared socket causes missed events and the
// "connecting" loop.
export function getSocket() {
  return io(BACKEND_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    // Reconnect aggressively — mobile networks drop frequently
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });
}

// Keep a ref to the current active socket for the lifetime of a room session.
// useChatRoom creates one on mount and destroys it on unmount.
