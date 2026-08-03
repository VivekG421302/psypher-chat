import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ArrowRight, Loader2, KeySquare, Timer, Gamepad2,
  Clock, Hash, Trash2, ChevronRight,
} from 'lucide-react';
import DecryptText from '../components/DecryptText.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import {
  rememberRoom, listPastRooms, forgetRoom, getDeviceId, touchRoom,
} from '../lib/storage.js';

const FEATURES = [
  { icon: KeySquare,  title: 'Room code = encryption key', body: 'AES-256-GCM encrypted in your browser. The server only ever sees ciphertext.' },
  { icon: Timer,      title: 'Vanishes when you leave',    body: 'Rooms and messages disappear the moment both people leave or after 15 min of silence.' },
  { icon: Gamepad2,   title: 'Built-in minigames',         body: 'UNO, Chess, Guess Who, Glass Bridge and more — play without leaving the chat.' },
];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

/* ── Past rooms panel ───────────────────────────────────────────── */
function PastRooms({ onJoin }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    setRooms(listPastRooms());
  }, []);

  if (rooms.length === 0) return null;

  function forget(e, roomId) {
    e.stopPropagation();
    forgetRoom(roomId);
    setRooms(listPastRooms());
  }

  async function rejoin(room) {
    setLoading(room.roomId);
    await onJoin(room.roomId, room.userId, room.name);
    setLoading(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35 }}
      className="mt-6"
    >
      <p className="text-xs text-mist-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Clock size={11} /> Past rooms
      </p>
      <div className="space-y-1.5">
        {rooms.slice(0, 6).map(room => (
          <div
            key={room.roomId}
            onClick={() => rejoin(room)}
            className="group flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-800/40 px-3 py-2.5 cursor-pointer hover:border-signal-700/60 hover:bg-ink-700/40 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-ink-700/60 border border-ink-600/60 flex items-center justify-center shrink-0">
              <Hash size={13} className="text-mist-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-mist-200 font-medium truncate">
                {room.label || room.roomId}
              </p>
              <p className="text-[10px] text-mist-600 flex items-center gap-1">
                <span className="font-display tracking-wider">{room.roomId}</span>
                <span>·</span>
                <span>{timeAgo(room.lastActive || room.joinedAt)}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {loading === room.roomId
                ? <Loader2 size={13} className="text-mist-500 animate-spin" />
                : <ChevronRight size={13} className="text-mist-600 group-hover:text-mist-300 transition-colors" />
              }
              <button
                onClick={e => forget(e, room.roomId)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-danger/20 text-danger/60 hover:text-danger transition-all cursor-pointer"
                title="Remove from history"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Main Landing ───────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const { profile, setName } = useProfile();
  const { notify } = useToast();

  const [mode, setMode]           = useState('create'); // 'create' | 'join'
  const [nameInput, setNameInput] = useState(profile?.name || '');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading]     = useState(false);

  // Ensure deviceId exists on load
  useEffect(() => { getDeviceId(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return notify('Enter a display name first.', 'error');
    if (trimmed.length > 32) return notify('Keep your name under 32 characters.', 'error');

    setName(trimmed);
    setLoading(true);
    try {
      if (mode === 'create') {
        const res = await api.createRoom(trimmed);
        rememberRoom(res.roomId, { userId: res.userId, name: trimmed, label: `My room · ${res.roomId}` });
        notify('Room created — share the code with one other person.', 'success');
        navigate(`/room/${res.roomId}`);
      } else {
        const code = codeInput.trim().toUpperCase();
        if (!code) return notify('Enter a room code to join.', 'error');
        const res = await api.joinRoom(code, { name: trimmed });
        rememberRoom(res.roomId, { userId: res.userId, name: trimmed, label: res.roomId });
        navigate(`/room/${res.roomId}`);
      }
    } catch (err) {
      notify(err.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRejoin(roomId, userId, name) {
    const displayName = name || profile?.name || 'Guest';
    try {
      const res = await api.joinRoom(roomId, { name: displayName, userId });
      touchRoom(roomId);
      navigate(`/room/${roomId}`);
    } catch (err) {
      notify(err.message || 'Could not rejoin that room — it may have expired.', 'error');
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-signal-800/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-cipher-800/8 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-5 pt-14 pb-24 md:pt-20">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-12 justify-center md:justify-start"
        >
          <ShieldCheck className="text-signal-500" size={20} />
          <span className="font-display text-xs tracking-[0.22em] text-mist-500">PSYPHER CHAT</span>
        </motion.div>

        <div className="grid md:grid-cols-[1.15fr,0.85fr] gap-14 items-start">
          {/* Left — hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.08] font-semibold text-mist-100">
              <DecryptText text="Say it, then" as="span" className="block" />
              <span className="block text-signal-500 mt-1">
                <DecryptText text="let it disappear." speed={22} />
              </span>
            </h1>
            <p className="mt-5 text-mist-400 text-sm sm:text-base max-w-lg leading-relaxed">
              Two-person encrypted rooms — no accounts, no logs. The room code
              is your invite and your encryption key. Close the tab and the
              conversation is gone.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              {FEATURES.map(f => (
                <div key={f.title} className="rounded-xl border border-ink-700/60 bg-ink-800/30 p-4">
                  <f.icon size={16} className="text-cipher-500 mb-2" />
                  <p className="text-xs font-semibold text-mist-200 mb-1">{f.title}</p>
                  <p className="text-[11px] text-mist-600 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — form + past rooms */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <div className="rounded-2xl border border-ink-700/60 bg-ink-800/60 backdrop-blur p-5">
              {/* Mode toggle */}
              <div className="flex rounded-xl bg-ink-900/80 p-1 mb-5">
                {['create', 'join'].map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-all ${
                      mode === m
                        ? 'bg-signal-500 text-ink-950 shadow-sm'
                        : 'text-mist-500 hover:text-mist-200'
                    }`}>
                    {m} room
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-mist-600 mb-1.5 uppercase tracking-widest">
                    Display name
                  </label>
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="e.g. Nyx"
                    maxLength={32}
                    autoComplete="off"
                    className="w-full rounded-xl bg-ink-900/80 border border-ink-600/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500/60 outline-none transition-colors"
                  />
                </div>

                <AnimatePresence>
                  {mode === 'join' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-[11px] font-medium text-mist-600 mb-1.5 uppercase tracking-widest">
                        Room code
                      </label>
                      <input
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. 4DAN6AYL"
                        maxLength={8}
                        autoComplete="off"
                        className="w-full rounded-xl bg-ink-900/80 border border-ink-600/60 px-3.5 py-2.5 text-sm font-display tracking-widest text-mist-100 placeholder:text-mist-700 placeholder:tracking-normal focus:border-cipher-500/60 outline-none transition-colors"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-signal-500 hover:bg-signal-400 disabled:opacity-50 text-ink-950 font-semibold text-sm py-2.5 transition-colors"
                >
                  {loading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <>{mode === 'create' ? 'Create room' : 'Join room'} <ArrowRight size={15} /></>
                  }
                </button>
              </form>

              <p className="mt-4 text-[10px] text-mist-700 leading-relaxed text-center">
                Rooms hold exactly two people. Treat the code like a password.
              </p>
            </div>

            {/* Past rooms */}
            <PastRooms onJoin={handleRejoin} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
