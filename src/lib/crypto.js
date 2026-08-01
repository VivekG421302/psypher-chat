/**
 * Psypher Chat — client-side encryption.
 *
 * The room code doubles as the encryption key. It never leaves the browser
 * in plaintext form to the server as a "key" — the server only ever sees
 * opaque base64 ciphertext blobs. Anyone who has the room code can decrypt;
 * the server cannot, because it never derives or stores the AES key.
 */

async function deriveKey(roomCode) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(roomCode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = await crypto.subtle.digest('SHA-256', encoder.encode(`psypher-salt-${roomCode}`));

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

const keyCache = new Map();
async function getKey(roomCode) {
  if (!keyCache.has(roomCode)) {
    keyCache.set(roomCode, await deriveKey(roomCode));
  }
  return keyCache.get(roomCode);
}

export async function encryptText(plaintext, roomCode) {
  const key = await getKey(roomCode);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bufToB64(combined);
}

export async function decryptText(ciphertext, roomCode) {
  try {
    const key = await getKey(roomCode);
    const combined = b64ToBuf(ciphertext);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return null; // wrong key or tampered payload
  }
}

function bufToB64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBuf(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 68%, 58%)`;
}
