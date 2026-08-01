# Psypher Chat

Ephemeral, end-to-end encrypted 2-person chat rooms — with a built-in minigame
section, currently featuring UNO. No accounts, no server-side history, no
database. When a room empties out or the backend goes to sleep, the room and
everything in it is gone for good.

- **Frontend** (this repo): React + Vite, deployed to **Vercel**
- **Backend**: Node + Express + Socket.IO, deployed to **Render**
- Repo: [psypher-chat](https://github.com/VivekG421302/psypher-chat) (frontend) ·
  [psypher-chat-backend](https://github.com/VivekG421302/psypher-chat-backend) (backend)

---

## How it works

- **The room code is the encryption key.** When you create or join a room,
  your browser derives an AES-256-GCM key from the room code (PBKDF2, 100k
  iterations) using the Web Crypto API. Every message is encrypted client-side
  before it's sent. The backend only ever stores/relays base64 ciphertext —
  it has no way to read your messages.
- **Rooms hold exactly two people.** One person creates a room and shares the
  code once, like a password. A third join attempt is rejected.
- **One person, many rooms.** Nothing ties your browser to a single room —
  you can create or join several rooms in different tabs. Your profile
  (display name, color) lives in `localStorage` and is reused everywhere;
  your membership in each room is remembered separately so a page refresh
  doesn't register you as a "new" third member.
- **Nothing persists.** The backend keeps rooms entirely in memory. A room is
  deleted automatically 15 minutes after its last activity, or ~45 seconds
  after both members disconnect. If the backend process itself restarts or
  sleeps, every room disappears immediately, by construction.
- **Minigames are a plugin system.** The "Minigames" panel inside a room asks
  the backend what games are registered (`GET /api/games`) and renders
  whichever ones the frontend has a matching component for. UNO is the first;
  see [Adding a new minigame](#adding-a-new-minigame) below.

---

## Hosting guide

This app is built around Render's **free tier**, which spins a web service
down after ~15 minutes with no incoming requests and wipes its memory on the
next request (a cold start). That's a real limitation for most apps — here
it's used on purpose as the cleanup mechanism, so no cron job or database
is needed to expire old rooms. Keep this in mind:

- Anyone in a room during a cold start / sleep cycle will be disconnected and
  their room will be gone. This is expected behavior, not a bug.
- The very first request after the backend has been asleep can take 30–60
  seconds to respond while Render boots the container back up. The frontend
  will show a "Connecting…" state during this time; if creating/joining a
  room fails on the first try, wait a few seconds and try again.
- If you need rooms to survive longer or restarts to not nuke active
  sessions, upgrade the Render service to a paid plan (which doesn't sleep),
  or swap `src/roomManager.js` for a Redis-backed store — the interface is
  small and isolated on purpose.

### 1. Deploy the backend to Render

1. Push `psypher-chat-backend` to your own GitHub account (already done if
   you're reading this from that repo).
2. In the [Render dashboard](https://dashboard.render.com), choose
   **New → Web Service** and connect the `psypher-chat-backend` repo.
   Render will pick up the included `render.yaml`, or configure manually:
   - **Environment**: Node
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Plan**: Free
3. Add an environment variable:
   - `CORS_ORIGIN` = the URL of your deployed Vercel frontend (e.g.
     `https://psypher-chat.vercel.app`). Use `*` temporarily while testing,
     then lock it down once you have your real frontend URL.
4. Deploy. Once live, note the service URL, e.g.
   `https://psypher-chat-backend.onrender.com`. Confirm it's healthy:
   `curl https://psypher-chat-backend.onrender.com/api/health`

### 2. Deploy the frontend to Vercel

1. Push this repo (`psypher-chat`) to your own GitHub account.
2. In [Vercel](https://vercel.com/new), import the repo. Vercel auto-detects
   Vite; defaults are fine:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Add an environment variable:
   - `VITE_BACKEND_URL` = your Render backend URL from step 1 (no trailing
     slash), e.g. `https://psypher-chat-backend.onrender.com`
4. Deploy. `vercel.json` is already set up to rewrite all routes to
   `index.html` so client-side routing (`/room/:roomId`) works on refresh.
5. Go back to Render and make sure `CORS_ORIGIN` matches your final Vercel
   URL exactly (including `https://`, no trailing slash), then redeploy the
   backend if you changed it.

### 3. Local development

Backend:

```bash
cd backend
npm install
cp .env.example .env      # CORS_ORIGIN=* is fine for local dev
npm start                 # http://localhost:3000
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_BACKEND_URL=http://localhost:3000
npm run dev                  # http://localhost:5173
```

Open two browser tabs (or a normal + private window, since profiles are
stored per-browser-profile in `localStorage`) to simulate two people in a
room.

---

## Project structure

```
frontend/
  src/
    components/       Chat UI: header, message list/input, avatars, toasts
    context/           Profile (identity) + toast providers
    games/
      registry.js       Maps a game id -> its React component
      uno/               UNO board, cards, socket hook
    lib/                crypto.js, api.js, socket.js, storage.js, useChatRoom.js
    pages/              Landing, Room, NotFound

backend/
  src/
    roomManager.js      In-memory room store + cleanup loop
    routes.js            REST: create/join/lookup a room, list games
    socket.js             Socket.IO: chat relay + generic game dispatcher
    games/
      registry.js          List of installed games
      uno/                 UNO rules engine + socket action handlers
  server.js               Express + Socket.IO entry point
```

## Adding a new minigame

**Backend** — create `backend/src/games/<id>/index.js` exporting an object:

```js
export default {
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  emoji: '⭕',
  tagline: 'Quick 2-player classic',
  minPlayers: 2,
  maxPlayers: 2,
  createState(playerIds) { /* return initial state */ },
  start(state) { /* mark as started, deal/seed as needed */ },
  buildClientState(state, playerId) { /* return a per-player sanitized view */ },
  actions: {
    make_move(state, playerId, payload) { /* mutate state, throw on illegal moves */ },
  },
};
```

Register it in `backend/src/games/registry.js`. That's the entire backend
side — no new routes or socket wiring needed, the generic `game:join` /
`game:action` dispatcher in `src/socket.js` handles any game that follows
this shape.

**Frontend** — build a component under `src/games/<id>/` and add one line to
`src/games/registry.js`:

```js
export const GAME_COMPONENTS = {
  uno: UnoGame,
  tictactoe: TicTacToeGame,
};
```

The Minigames panel will automatically list it (via `GET /api/games`) and
render your component once selected.

---

## Security notes

- Encryption happens entirely client-side; the server cannot read messages,
  and losing the room code means losing access to that room's history.
- This is a hobby-grade E2E setup (AES-GCM keyed by a shareable room code),
  not a formally audited protocol like Signal's — treat it as "the server
  operator can't casually read your chats," not as protection against a
  determined, targeted attacker who can intercept the room code itself.
- There is no message persistence beyond a room's lifetime and a small
  in-memory buffer (last ~200 messages) used only to hand history to someone
  who reconnects while the room is still alive.
