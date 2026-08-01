import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, Send, MessageSquare, ChevronDown, ChevronUp, Smile } from 'lucide-react';
import { api } from '../lib/api.js';
import { GAME_COMPONENTS } from '../games/registry.js';
import Avatar from './Avatar.jsx';
import QuickReactBar from './QuickReactBar.jsx';

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

/**
 * A persistent, collapsible chat feed inside the games drawer. Previously
 * only *new* messages surfaced (as transient callouts) while a game was
 * open — the full conversation was invisible behind the drawer, especially
 * on mobile where the drawer covers the whole screen. This keeps the real
 * history reachable without needing to close the game.
 */
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
    if (!typingActive.current) {
      typingActive.current = true;
      onTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      typingActive.current = false;
      onTyping(false);
    }, 1500);
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
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-mist-400 hover:text-mist-100 transition-colors enabled:cursor-pointer"
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
                <div
                  className={`rounded-lg px-2.5 py-1.5 text-xs leading-snug break-words ${
                    m.mine ? 'bg-signal-500 text-ink-950' : 'bg-ink-700 text-mist-100'
                  }`}
                >
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
          placeholder="Say something without leaving the game…"
          maxLength={1000}
          className="flex-1 rounded-lg bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="shrink-0 rounded-lg bg-signal-500 disabled:bg-ink-700 disabled:text-mist-700 disabled:cursor-not-allowed enabled:cursor-pointer text-ink-950 p-2 hover:bg-signal-300 transition-colors"
          aria-label="Send message"
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

/**
 * Floating, rising-and-fading emoji particles for the minigame — a quick
 * way to react to a move without leaving the game (like a live-stream
 * reaction burst). Driven by the room-wide 'room:reaction' relay, so both
 * players see every burst, not just the sender.
 */
function GameReactionBurst({ reactions }) {
  const [particles, setParticles] = useState([]);
  const lastLenRef = useRef(0);

  useEffect(() => {
    if (reactions.length <= lastLenRef.current) {
      lastLenRef.current = reactions.length;
      return;
    }
    const fresh = reactions.slice(lastLenRef.current);
    lastLenRef.current = reactions.length;

    const spawned = fresh.map((r) => ({
      uid: `${r.id}-${Math.random()}`,
      emoji: r.emoji,
      x: 20 + Math.random() * 60,
    }));
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
            onPick={(emoji) => {
              onPick(emoji);
              setOpen(false);
            }}
          />
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-ink-800 border border-ink-600 flex items-center justify-center text-mist-300 hover:border-signal-500/60 hover:text-signal-500 shadow-lg enabled:cursor-pointer transition-colors"
        aria-label="Send a reaction"
      >
        <Smile size={18} />
      </button>
    </div>
  );
}

export default function GamesDrawer({ open, onClose, roomId, identity, memberCount, chat }) {
  const [games, setGames] = useState([]);
  const [activeGameId, setActiveGameId] = useState(null);
  const callouts = useCallouts(chat.messages, open);

  useEffect(() => {
    if (open && games.length === 0) {
      api.games().then((res) => setGames(res.games)).catch(() => setGames([]));
    }
  }, [open, games.length]);

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
            <div className="relative flex items-center justify-between px-4 py-3 border-b border-ink-700 shrink-0">
              <div className="flex items-center gap-2">
                {activeGameId && (
                  <button
                    onClick={() => setActiveGameId(null)}
                    className="text-mist-500 hover:text-mist-100 transition-colors"
                    aria-label="Back to games list"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <h2 className="font-display text-sm tracking-widest text-mist-100">
                  {activeGameId ? games.find((g) => g.id === activeGameId)?.name : 'MINIGAMES'}
                </h2>
              </div>
              <button onClick={onClose} className="text-mist-500 hover:text-mist-100 transition-colors" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="relative flex-1 overflow-y-auto">
              <CalloutStack callouts={callouts} />

              {!activeGameId && (
                <div className="p-4 space-y-2.5">
                  {memberCount < 2 && (
                    <p className="text-xs text-signal-500 bg-signal-700/10 border border-signal-700/30 rounded-lg px-3 py-2 mb-2">
                      Waiting for a second person to join — games need two players.
                    </p>
                  )}
                  {games.map((g) => {
                    const available = !!GAME_COMPONENTS[g.id];
                    return (
                      <button
                        key={g.id}
                        disabled={!available}
                        onClick={() => setActiveGameId(g.id)}
                        className="w-full text-left rounded-xl border border-ink-700 bg-ink-800/60 hover:border-cipher-500/50 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer disabled:hover:border-ink-700 transition-colors p-4 flex items-center gap-3"
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-mist-100">{g.name}</p>
                          <p className="text-xs text-mist-500">{g.tagline}</p>
                        </div>
                      </button>
                    );
                  })}
                  {games.length === 0 && (
                    <p className="text-sm text-mist-500 px-1">Loading games…</p>
                  )}
                </div>
              )}

              {activeGameId &&
                GAME_COMPONENTS[activeGameId] &&
                (() => {
                  const GameComponent = GAME_COMPONENTS[activeGameId];
                  return <GameComponent roomId={roomId} identity={identity} connected={chat.connected} />;
                })()}

              {activeGameId && (
                <>
                  <GameReactionBurst reactions={chat.gameReactions} />
                  <GameReactTrigger onPick={chat.sendGameReaction} />
                </>
              )}
            </div>

            {activeGameId && (
              <InGameChat
                messages={chat.messages}
                onSend={chat.sendMessage}
                onTyping={chat.setTyping}
                typingUser={chat.typingUser}
              />
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
