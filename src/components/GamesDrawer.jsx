import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ChevronLeft, Send, MessageSquare, ChevronDown, ChevronUp, Smile,
  Layers, Dices, Grid3x3, Shuffle, Crown, Pencil, Swords,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { GAME_COMPONENTS } from '../games/registry.js';
import Avatar from './Avatar.jsx';
import QuickReactBar from './QuickReactBar.jsx';

// Map game IDs to Lucide icons (no emoji)
const GAME_ICONS = {
  uno: Layers,
  guesswho: Crown,
  tictactoe: Grid3x3,
  'glass-bridge': Shuffle,
  chess: Swords,
  sketch: Pencil,
  default: Dices,
};

function GameIcon({ id, size = 20 }) {
  const Icon = GAME_ICONS[id] || GAME_ICONS.default;
  return <Icon size={size} />;
}

// ── Ping color helper ───────────────────────────────────────────────────────
function pingColor(ms) {
  if (ms == null) return 'text-mist-600';
  if (ms < 80) return 'text-cipher-500';   // green
  if (ms < 200) return 'text-signal-500';  // yellow
  return 'text-danger';                    // red
}

function PingDisplay({ socket }) {
  const [ping, setPing] = useState(null);

  useEffect(() => {
    if (!socket?.current) return;
    function measure() {
      const start = Date.now();
      socket.current.emit('ping');
      socket.current.once('pong', () => setPing(Date.now() - start));
    }
    measure();
    const id = setInterval(measure, 5000);
    return () => clearInterval(id);
  }, [socket]);

  if (ping == null) return null;
  return (
    <span className={`text-[10px] font-mono ${pingColor(ping)}`} title="Ping to server">
      {ping}ms
    </span>
  );
}

function useCallouts(messages, open) {
  const [callouts, setCallouts] = useState([]);
  const lastSeenId = useRef(null);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (lastSeenId.current === last.id) return;
    lastSeenId.current = last.id;
    if (!open || last.kind !== 'message' || last.mine) return;
    const entry = { uid: `${last.id}-${Date.now()}`, name: last.senderName, color: last.senderColor, text: last.text };
    setCallouts((c) => [...c.slice(-2), entry]);
    const timer = setTimeout(() => {
      setCallouts((c) => c.filter((x) => x.uid !== entry.uid));
    }, 5000);
    return () => clearTimeout(timer);
  }, [messages, open]);

  return callouts;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function InGameChat({ messages, onSend, onTyping, typingUser }) {
  const [expanded, setExpanded] = useState(true);
  const [value, setValue] = useState('');
  const listRef = useRef(null);
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);

  useEffect(() => {
    if (expanded) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, expanded, typingUser]);

  function handleChange(e) {
    setValue(e.target.value);
    if (!typingActive.current) { typingActive.current = true; onTyping(true); }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => { typingActive.current = false; onTyping(false); }, 1500);
  }

  function submit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    typingActive.current = false;
    onTyping(false);
  }

  const realMessages = messages.filter((m) => m.kind === 'message');

  return (
    <div className="border-t border-ink-700 bg-ink-900 shrink-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-mist-400 hover:text-mist-100 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare size={13} />
          Chat {realMessages.length > 0 ? `(${realMessages.length})` : ''}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div ref={listRef} className="max-h-40 overflow-y-auto px-3 pb-2 space-y-2">
          {realMessages.length === 0 && <p className="text-xs text-mist-700 text-center py-3">No messages yet.</p>}
          {realMessages.map((m) => (
            <div key={m.id} className={`flex items-end gap-1.5 ${m.mine ? 'flex-row-reverse' : ''}`}>
              <Avatar name={m.senderName} color={m.senderColor} size={20} />
              <div className={`max-w-[75%] flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-lg px-2.5 py-1.5 text-xs leading-snug break-words ${m.mine ? 'bg-signal-500 text-ink-950' : 'bg-ink-700 text-mist-100'}`}>
                  {m.text}
                </div>
                <span className="text-[9px] text-mist-700 mt-0.5">{formatTime(m.ts)}</span>
              </div>
            </div>
          ))}
          {typingUser && <p className="text-[10px] text-mist-600 pl-1">{typingUser} is typing…</p>}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2 px-2.5 pb-2.5">
        <input
          value={value}
          onChange={handleChange}
          onFocus={() => setExpanded(true)}
          placeholder="Say something…"
          maxLength={1000}
          className="flex-1 rounded-lg bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="shrink-0 rounded-lg bg-signal-500 disabled:bg-ink-700 disabled:text-mist-700 disabled:cursor-not-allowed cursor-pointer text-ink-950 p-2 hover:bg-signal-300 transition-colors"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function CalloutStack({ callouts }) {
  return (
    <div className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex flex-col gap-2">
      <AnimatePresence>
        {callouts.map((c) => (
          <motion.div
            key={c.uid}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-start gap-2 rounded-xl rounded-tl-sm border border-ink-600 bg-ink-800/95 backdrop-blur px-3 py-2 shadow-lg max-w-full"
          >
            <Avatar name={c.name} color={c.color} size={22} />
            <div className="min-w-0">
              <p className="text-[11px] text-mist-500 leading-none mb-0.5">{c.name}</p>
              <p className="text-sm text-mist-100 break-words leading-snug">{c.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function GameReactionBurst({ reactions }) {
  const [particles, setParticles] = useState([]);
  const lastLenRef = useRef(0);

  useEffect(() => {
    if (reactions.length <= lastLenRef.current) { lastLenRef.current = reactions.length; return; }
    const fresh = reactions.slice(lastLenRef.current);
    lastLenRef.current = reactions.length;
    const spawned = fresh.map((r) => ({ uid: `${r.id}-${Math.random()}`, emoji: r.emoji, x: 20 + Math.random() * 60 }));
    setParticles((prev) => [...prev, ...spawned]);
    spawned.forEach((p) => {
      setTimeout(() => setParticles((prev) => prev.filter((x) => x.uid !== p.uid)), 1900);
    });
  }, [reactions]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.uid}
            initial={{ opacity: 1, y: 0, scale: 0.6 }}
            animate={{ opacity: 0, y: -180, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute bottom-16 text-3xl"
            style={{ left: `${p.x}%` }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function GameReactTrigger({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-4 right-4 z-20">
      <AnimatePresence>
        {open && (
          <QuickReactBar
            className="absolute bottom-full mb-2 right-0"
            onPick={(emoji) => { onPick(emoji); setOpen(false); }}
          />
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-ink-800 border border-ink-600 flex items-center justify-center text-mist-300 hover:border-signal-500/60 hover:text-signal-500 shadow-lg cursor-pointer transition-colors"
        aria-label="Send a reaction"
      >
        <Smile size={18} />
      </button>
    </div>
  );
}

function GameListSkeleton() {
  return (
    <div className="p-4 space-y-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-ink-700 bg-ink-800/60 p-4 flex items-center gap-3">
          <div className="skeleton animate-shimmer w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton animate-shimmer h-3 w-24 rounded" style={{ animationDelay: `${i * 0.08}s` }} />
            <div className="skeleton animate-shimmer h-2.5 w-40 rounded" style={{ animationDelay: `${i * 0.08}s` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * GamesDrawer — works in two modes:
 *   inline=false (old): slides in as a fixed overlay panel.
 *   inline=true (new):  rendered as a plain flex column inside the Room layout
 *                       and sits beside the chat on desktop; Room handles
 *                       toggling between chat/game on mobile.
 */
export default function GamesDrawer({
  open, onClose, roomId, identity, memberCount, chat, inline = false,
  opponentActiveGame = null, // { gameId } tracked at Room level — see Room.jsx
}) {
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState(false);
  const [activeGameId, setActiveGameId] = useState(null);
  const callouts = useCallouts(chat.messages, open);

  // Notify others when we start/leave a game
  useEffect(() => {
    if (!chat.socket?.current) return;
    if (activeGameId) {
      chat.socket.current.emit('game:started', { roomId, gameId: activeGameId, startedBy: identity.userId });
    } else {
      chat.socket.current.emit('game:ended', { roomId });
    }
  }, [activeGameId, roomId, identity.userId, chat.socket]);

  function loadGames() {
    setGamesLoading(true);
    setGamesError(false);
    api.games()
      .then((res) => setGames(res.games))
      .catch(() => setGamesError(true))
      .finally(() => setGamesLoading(false));
  }

  useEffect(() => {
    if (open && games.length === 0 && !gamesLoading) loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const innerContent = (
    <>
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-ink-700 shrink-0">
        <div className="flex items-center gap-2">
          {activeGameId && (
            <button
              onClick={() => setActiveGameId(null)}
              className="text-mist-500 hover:text-mist-100 transition-colors cursor-pointer"
              aria-label="Back to games list"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <h2 className="font-display text-sm tracking-widest text-mist-100 flex items-center gap-1.5">
            {activeGameId && (
              <span className="text-cipher-400">
                <GameIcon id={activeGameId} size={16} />
              </span>
            )}
            {activeGameId ? games.find((g) => g.id === activeGameId)?.name : 'MINIGAMES'}
          </h2>
          {/* Ping display when in a game */}
          {activeGameId && (
            <PingDisplay socket={chat.socket} />
          )}
        </div>
        <button onClick={onClose} className="text-mist-500 hover:text-mist-100 transition-colors cursor-pointer" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="relative flex-1 min-h-0 overflow-y-auto flex flex-col">
        <CalloutStack callouts={callouts} />

        {!activeGameId && (
          <>
            {memberCount < 2 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mt-4 flex items-center gap-2 text-xs text-signal-500 bg-signal-700/10 border border-signal-700/30 rounded-lg px-3 py-2.5"
              >
                <span className="flex gap-0.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse-soft" />
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse-soft [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse-soft [animation-delay:0.3s]" />
                </span>
                Waiting for a second person — games need two players.
              </motion.div>
            )}

            {gamesLoading && <GameListSkeleton />}

            {!gamesLoading && gamesError && (
              <div className="p-4">
                <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-center">
                  <p className="text-sm text-danger mb-2">Couldn't load the games list.</p>
                  <button onClick={loadGames} className="text-xs rounded-lg border border-danger/40 text-danger px-3 py-1.5 hover:bg-danger/10 transition-colors cursor-pointer">
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!gamesLoading && !gamesError && (
              <div className="p-4 space-y-2.5">
                {games.map((g, i) => {
                  const available = !!GAME_COMPONENTS[g.id];
                  const opponentPlaying = opponentActiveGame === g.id;
                  return (
                    <motion.button
                      key={g.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      disabled={!available}
                      onClick={() => setActiveGameId(g.id)}
                      className="group w-full text-left rounded-xl border border-ink-700 bg-ink-800/60 hover:border-cipher-500/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer disabled:hover:border-ink-700 transition-colors p-4 flex items-center gap-3"
                    >
                      {/* Lucide icon, no emoji */}
                      <div className="w-10 h-10 rounded-lg bg-ink-700 flex items-center justify-center text-mist-400 group-hover:text-cipher-400 transition-colors shrink-0 relative">
                        <GameIcon id={g.id} size={20} />
                        {/* Green dot when opponent has this game open */}
                        {opponentPlaying && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cipher-500 ring-2 ring-ink-800 animate-pulse-soft" title="Your partner is playing this" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-mist-100 flex items-center gap-1.5">
                          {g.name}
                          {!available && <span className="text-[9px] uppercase tracking-wider text-mist-700 border border-ink-600 rounded-full px-1.5 py-0.5">Soon</span>}
                          {opponentPlaying && <span className="text-[9px] uppercase tracking-wider text-cipher-500 border border-cipher-500/40 rounded-full px-1.5 py-0.5">Playing</span>}
                        </p>
                        <p className="text-xs text-mist-500 truncate">{g.tagline}</p>
                      </div>
                      {available && (
                        <ChevronLeft size={14} className="rotate-180 text-mist-700 group-hover:text-cipher-500 shrink-0 transition-colors" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeGameId && GAME_COMPONENTS[activeGameId] && (() => {
          const GameComponent = GAME_COMPONENTS[activeGameId];
          return (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <GameComponent
                roomId={roomId}
                identity={identity}
                connected={chat.connected}
                chat={chat}
                onClose={() => setActiveGameId(null)}
              />
            </div>
          );
        })()}

        {activeGameId && <GameReactionBurst reactions={chat.gameReactions} />}
      </div>
    </>
  );

  // Inline mode: just render as a plain flex column (Room places it beside chat)
  if (inline) {
    return (
      <div className="flex flex-col h-full bg-ink-900">
        {innerContent}
      </div>
    );
  }

  // Overlay mode (legacy / mobile fallback): slide-in fixed panel
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[420px] bg-ink-900 border-l border-ink-700 flex flex-col"
          >
            {innerContent}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
