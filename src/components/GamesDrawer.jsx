import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { GAME_COMPONENTS } from '../games/registry.js';
import Avatar from './Avatar.jsx';

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

function QuickChatBar({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);

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

  return (
    <form onSubmit={submit} className="border-t border-ink-700 bg-ink-900 p-2.5 flex items-center gap-2">
      <input
        value={value}
        onChange={handleChange}
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
  );
}

function CalloutStack({ callouts }) {
  return (
    <div className="pointer-events-none absolute top-14 left-3 right-3 z-10 flex flex-col gap-2">
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
            </div>

            {activeGameId && <QuickChatBar onSend={chat.sendMessage} onTyping={chat.setTyping} />}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
