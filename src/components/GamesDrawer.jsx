import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { api } from '../lib/api.js';
import { GAME_COMPONENTS } from '../games/registry.js';

export default function GamesDrawer({ open, onClose, roomId, identity, memberCount }) {
  const [games, setGames] = useState([]);
  const [activeGameId, setActiveGameId] = useState(null);

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
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
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

            <div className="flex-1 overflow-y-auto">
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
                        className="w-full text-left rounded-xl border border-ink-700 bg-ink-800/60 hover:border-cipher-500/50 disabled:opacity-40 disabled:hover:border-ink-700 transition-colors p-4 flex items-center gap-3"
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
                  return <GameComponent roomId={roomId} identity={identity} />;
                })()}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
