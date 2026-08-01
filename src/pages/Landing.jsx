import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, KeySquare, Timer, Gamepad2, ArrowRight, Loader2 } from 'lucide-react';
import DecryptText from '../components/DecryptText.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { rememberRoom } from '../lib/storage.js';

const FEATURES = [
  {
    icon: KeySquare,
    title: 'Room code is the key',
    body: 'Messages are encrypted in your browser with AES-256-GCM, derived from the room code itself. The server only ever relays ciphertext.',
  },
  {
    icon: Timer,
    title: 'Nothing outlives the room',
    body: 'Rooms and every message inside them vanish the moment both people leave, or after 15 minutes of silence.',
  },
  {
    icon: Gamepad2,
    title: 'Built-in minigames',
    body: 'Break the ice with a round of UNO right inside the room. More games are on the way.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { profile, setName } = useProfile();
  const { notify } = useToast();

  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [nameInput, setNameInput] = useState(profile?.name || '');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

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
        rememberRoom(res.roomId, { userId: res.userId, name: trimmed });
        notify('Room created. Share the code with one other person.', 'success');
        navigate(`/room/${res.roomId}`);
      } else {
        const code = codeInput.trim().toUpperCase();
        if (!code) return notify('Enter a room code to join.', 'error');
        const res = await api.joinRoom(code, { name: trimmed });
        rememberRoom(res.roomId, { userId: res.userId, name: trimmed });
        navigate(`/room/${res.roomId}`);
      }
    } catch (err) {
      notify(err.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-signal-700/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-cipher-700/10 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-24 md:pt-24">
        <div className="flex items-center gap-2 mb-10 justify-center md:justify-start">
          <ShieldCheck className="text-signal-500" size={22} />
          <span className="font-display text-sm tracking-[0.2em] text-mist-500">PSYPHER CHAT</span>
        </div>

        <div className="grid md:grid-cols-[1.1fr,0.9fr] gap-14 items-start">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.08] font-semibold text-mist-100">
              <DecryptText text="Say it, then" as="span" className="block" />
              <span className="block text-signal-500">
                <DecryptText text="let it disappear." speed={22} />
              </span>
            </h1>
            <p className="mt-5 text-mist-300 text-base sm:text-lg max-w-lg leading-relaxed">
              A two-person chat room with no accounts and no server-side memory. The room code
              is both your invite and your encryption key — lose it, and the conversation is
              unreadable to anyone, including us.
            </p>

            <div className="mt-10 grid sm:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-ink-700 bg-ink-800/60 p-4">
                  <f.icon size={18} className="text-cipher-500 mb-2.5" />
                  <h3 className="text-sm font-semibold text-mist-100 mb-1">{f.title}</h3>
                  <p className="text-xs text-mist-500 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-ink-700 bg-ink-800/80 backdrop-blur p-6 shadow-glow"
          >
            <div className="flex rounded-xl bg-ink-900 p-1 mb-6">
              {['create', 'join'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                    mode === m ? 'bg-signal-500 text-ink-950' : 'text-mist-500 hover:text-mist-100'
                  }`}
                >
                  {m} room
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-mist-500 mb-1.5">
                  Display name
                </label>
                <input
                  id="name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Nyx"
                  maxLength={32}
                  autoComplete="off"
                  className="w-full rounded-lg bg-ink-900 border border-ink-600 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500 outline-none transition-colors"
                />
              </div>

              {mode === 'join' && (
                <div>
                  <label htmlFor="code" className="block text-xs font-medium text-mist-500 mb-1.5">
                    Room code
                  </label>
                  <input
                    id="code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 4DAN6AYL"
                    maxLength={8}
                    autoComplete="off"
                    className="w-full rounded-lg bg-ink-900 border border-ink-600 px-3.5 py-2.5 text-sm font-display tracking-widest text-mist-100 placeholder:text-mist-700 placeholder:tracking-normal focus:border-cipher-500 outline-none transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-signal-500 hover:bg-signal-300 disabled:opacity-60 text-ink-950 font-semibold text-sm py-2.75 py-2 transition-colors"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {mode === 'create' ? 'Create room' : 'Join room'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-[11px] text-mist-700 leading-relaxed">
              Rooms hold exactly two people. Whoever creates a room gets a code to share once —
              treat it like a password.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
