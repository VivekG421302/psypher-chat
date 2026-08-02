import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, AlertTriangle, BookOpen, Flag, MessageSquare, Send, X, Smile } from 'lucide-react';
import { useGlassBridge } from './useGlassBridge.js';
import QuickReactBar from '../../components/QuickReactBar.jsx';

const LEVELS = 10;
const PANELS = [1, 2, 3, 4];

/* ── Panel status colours ─────────────────────────────────────── */
const PANEL_STYLE = {
  unknown:  { bg: 'bg-cyan-900/40',   border: 'border-cyan-700/60',   text: 'text-cyan-300',  glow: '' },
  safe:     { bg: 'bg-emerald-900/50', border: 'border-emerald-500/80', text: 'text-emerald-300', glow: 'shadow-emerald-500/40 shadow-md' },
  broken:   { bg: 'bg-red-950/60',    border: 'border-red-800/60',    text: 'text-red-700',   glow: '' },
};

/* ── Player colours ───────────────────────────────────────────── */
const PLAYER_COLORS = ['#3576E0', '#E8B93D', '#2E9E63', '#D6373F'];
const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];

/* ── Rules Modal ──────────────────────────────────────────────── */
function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <p className="font-display text-xs tracking-widest text-mist-100">GLASS BRIDGE · RULES</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-100 cursor-pointer"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3.5 text-[11.5px] text-mist-400 leading-relaxed">
          <RS title="🎯 Objective">Be the first player to cross all 10 bridge levels and reach the other side.</RS>
          <RS title="🪟 The Bridge">Each of the 10 levels has 4 glass panels. Exactly <b className="text-mist-200">1 panel per level is safe</b> (tempered glass). The other 3 are fragile and will shatter.</RS>
          <RS title="▶️ Your Turn">
            <p>When it's your turn, choose a panel (1–4) on your current level by tapping it or pressing <b className="text-mist-200">1, 2, 3, or 4</b> on your keyboard.</p>
          </RS>
          <RS title="✅ Safe Step">The panel glows green. You advance to that level and immediately get to choose the next level.</RS>
          <RS title="💥 Fall">The panel shatters. You fall back to the start. Your turn ends and the next player goes.</RS>
          <RS title="🧠 Shared Memory">
            <p>All broken and safe panels stay revealed for everyone — even when your turn ends. Use this knowledge to skip known-safe steps quickly!</p>
          </RS>
          <RS title="🏆 Winning">First player to safely step on Level 10 wins the round.</RS>
          <RS title="⌨️ Controls">Tap a panel on the active row, or press <b className="text-mist-200">1 / 2 / 3 / 4</b> on your keyboard.</RS>
        </div>
      </div>
    </div>
  );
}
function RS({ title, children }) {
  return <div><p className="text-mist-200 font-semibold mb-1">{title}</p><div>{children}</div></div>;
}

/* ── Inline chat bar ──────────────────────────────────────────── */
function InlineChat({ onSend }) {
  const [value, setValue] = useState('');
  function submit(e) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    onSend(t);
    setValue('');
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2 border-t border-ink-700/60 bg-ink-900 shrink-0">
      <MessageSquare size={13} className="text-mist-600 shrink-0" />
      <input value={value} onChange={e => setValue(e.target.value)}
        placeholder="Quick message…" maxLength={200}
        className="flex-1 bg-transparent text-xs text-mist-200 placeholder:text-mist-700 outline-none" />
      <button type="submit" disabled={!value.trim()}
        className="shrink-0 text-mist-500 disabled:opacity-30 hover:text-signal-400 enabled:cursor-pointer transition-colors">
        <Send size={13} />
      </button>
    </form>
  );
}

/* ── Surrender modal ──────────────────────────────────────────── */
function SurrenderModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 p-5 w-full max-w-xs text-center"
        onClick={e => e.stopPropagation()}>
        <Flag size={22} className="text-danger mx-auto mb-3" />
        <p className="text-sm text-mist-100 font-medium mb-1">Give up?</p>
        <p className="text-xs text-mist-500 mb-4">Your opponent wins the round.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-100 cursor-pointer transition-colors">
            Keep going
          </button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">
            Surrender
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Floating chat bubbles ────────────────────────────────────── */
function FloatingBubbles({ bubbles }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {bubbles.map(b => (
          <motion.div key={b.uid}
            initial={{ opacity: 0, y: 0, scale: 0.85 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="absolute bottom-20"
            style={{ left: `${b.x}%`, transform: 'translateX(-50%)' }}>
            <div className="rounded-xl rounded-bl-sm bg-ink-700/95 border border-ink-500 px-3 py-1.5 shadow-lg max-w-[160px]">
              <p className="text-[10px] text-mist-500 mb-0.5">{b.name}</p>
              <p className="text-xs text-mist-100 break-words leading-snug">{b.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Fall animation overlay ───────────────────────────────────── */
function FallOverlay({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-red-950/40">
          <motion.div
            initial={{ scale: 0.5, y: 0 }}
            animate={{ scale: 1.5, y: 60 }}
            transition={{ duration: 0.6, ease: 'easeIn' }}
            className="text-5xl">💥</motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function GlassBridgeGame({ roomId, connected, chat }) {
  const { state, waiting, error, step, restart } = useGlassBridge(roomId, connected);
  const [showRules, setShowRules]       = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);
  const [showEmoji, setShowEmoji]       = useState(false);
  const [chatBubbles, setChatBubbles]   = useState([]);
  const [fallAnim, setFallAnim]         = useState(false);
  const lastMoveRef  = useRef(null);
  const lastMsgIdRef = useRef(null);

  // Keyboard 1-4
  useEffect(() => {
    if (!state?.myTurn || state?.winner) return;
    function onKey(e) {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) step(n);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state?.myTurn, state?.winner, step]);

  // Fall animation when lastMove result is 'fall' for me
  useEffect(() => {
    if (!state?.lastMove) return;
    const lm = state.lastMove;
    const key = `${lm.playerId}-${lm.level}-${lm.panel}`;
    if (lastMoveRef.current === key) return;
    lastMoveRef.current = key;
    if (lm.result === 'fall' && lm.playerId === state.myPlayerId) {
      setFallAnim(true);
      setTimeout(() => setFallAnim(false), 900);
    }
  }, [state?.lastMove, state?.myPlayerId]);

  // Incoming chat → floating bubble
  useEffect(() => {
    if (!chat?.messages?.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.kind !== 'message' || lastMsgIdRef.current === last.id) return;
    lastMsgIdRef.current = last.id;
    const bubble = { uid: `${last.id}-${Date.now()}`, name: last.senderName, text: last.text, x: 20 + Math.random() * 60 };
    setChatBubbles(b => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles(b => b.filter(x => x.uid !== bubble.uid)), 3000);
  }, [chat?.messages]);

  function handleSend(text) {
    chat?.sendMessage?.(text);
    const bubble = { uid: `own-${Date.now()}`, name: 'You', text, x: 20 + Math.random() * 60 };
    setChatBubbles(b => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles(b => b.filter(x => x.uid !== bubble.uid)), 3000);
  }

  /* ── Loading ── */
  if (!connected) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-mist-500 p-6 text-center">
      <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">RECONNECTING…</p>
    </div>
  );

  if (waiting || !state) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-mist-500 p-6 text-center">
      <div className="w-5 h-5 border-2 border-signal-500 border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">
        {waiting ? 'WAITING FOR OPPONENT' : 'CONNECTING…'}
      </p>
      {waiting && <p className="text-xs">Bridge deals once opponent opens the game.</p>}
    </div>
  );

  // Build player position map: level → [playerIds at that level]
  const posByLevel = {};
  for (const [pid, lvl] of Object.entries(state.positions)) {
    if (!posByLevel[lvl]) posByLevel[lvl] = [];
    posByLevel[lvl].push(pid);
  }

  const myLevel      = state.myPosition ?? 0;
  const activeLevel  = myLevel; // the row the active player needs to pick from (0-based, grid index)
  const isMyTurn     = state.myTurn && !state.winner;

  // Last move description
  const lm = state.lastMove;
  const lastMoveText = lm
    ? lm.result === 'safe'
      ? `${lm.playerLabel} → Level ${lm.level}, panel ${lm.panel} ✅`
      : `${lm.playerLabel} fell on Level ${lm.level}, panel ${lm.panel} 💥`
    : null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950 relative">
      <FloatingBubbles bubbles={chatBubbles} />
      <FallOverlay show={fallAnim} />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700 bg-ink-900">
        <button onClick={() => setShowEmoji(v => !v)}
          className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
          <Smile size={16} />
        </button>
        <span className="font-display text-xs tracking-widest text-mist-100">GLASS BRIDGE</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
            <BookOpen size={15} />
          </button>
          <button onClick={() => setShowSurrender(true)}
            className="p-1.5 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer">
            <Flag size={15} />
          </button>
        </div>
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <div className="absolute top-12 left-3 z-50">
            <QuickReactBar
              onPick={emoji => { chat?.sendGameReaction?.(emoji); setShowEmoji(false); }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ── SCROLLABLE BODY ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-3 py-2.5">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 shrink-0">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* Game over */}
        {state.winner && (
          <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center shrink-0">
            <p className="font-display text-xs text-signal-500 mb-1">BRIDGE CROSSED</p>
            <p className="text-sm text-mist-100 mb-3">
              {state.winner === state.myPlayerId ? '🏆 You made it!' : '😔 Opponent crossed first.'}
            </p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-3 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
              <RotateCcw size={13} /> Play again
            </button>
          </div>
        )}

        {/* Turn status */}
        <div className={`shrink-0 rounded-xl px-3 py-2 text-center text-[11px] font-display tracking-widest ${
          isMyTurn ? 'text-cipher-500 bg-cipher-700/10 ring-1 ring-cipher-500/40'
                   : 'text-mist-500 bg-ink-800/40'
        }`}>
          {state.winner ? '— GAME OVER —'
            : isMyTurn ? 'YOUR TURN — CHOOSE A PANEL'
            : "OPPONENT'S TURN"}
        </div>

        {/* Player positions summary */}
        <div className="shrink-0 flex gap-2 justify-center flex-wrap">
          {state.players.map((pid, idx) => {
            const pos = state.positions[pid] ?? 0;
            const isMe = pid === state.myPlayerId;
            const isActive = state.activePlayerId === pid;
            return (
              <div key={pid}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 border text-[10px] transition-all ${
                  isActive && !state.winner
                    ? 'border-cipher-500/60 bg-cipher-700/10'
                    : 'border-ink-700 bg-ink-800/40'
                }`}>
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: PLAYER_COLORS[idx] }} />
                <span className="text-mist-300 font-medium">
                  {isMe ? 'You' : PLAYER_LABELS[idx]}
                </span>
                <span className="text-mist-600">
                  {pos === 0 ? 'Start' : pos >= LEVELS ? 'Finish ✓' : `Lvl ${pos}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── BRIDGE GRID ─────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-1.5">
          {Array.from({ length: LEVELS }, (_, i) => i).map(lvlIdx => {
            // lvlIdx = 0 is level 1 (bottom of bridge)
            // Display levels bottom-up: level 1 at bottom, level 10 at top
            const levelNum   = lvlIdx + 1;                         // 1–10
            const gridRow    = state.grid[lvlIdx];                 // panel states for this level
            const playersHere = posByLevel[lvlIdx + 1] || [];       // players who have reached this level
            const playersAtStart = lvlIdx + 1 === 1 ? (posByLevel[0] || []) : [];

            // Is this the row the active (my) player needs to step on next?
            const isActiveRow = isMyTurn && myLevel === lvlIdx && !state.winner;

            // Has any panel been revealed on this row?
            const revealed = gridRow
              ? Object.entries(gridRow).filter(([,v]) => v !== 'unknown')
              : [];
            const safeRevealed = revealed.find(([,v]) => v === 'safe');

            return (
              <div key={lvlIdx}
                className={`relative rounded-xl p-1.5 transition-all ${
                  isActiveRow
                    ? 'bg-cyan-950/50 ring-1 ring-cyan-500/50'
                    : 'bg-ink-900/30'
                }`}>
                {/* Level label */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[9px] font-display tracking-widest w-10 text-right shrink-0 ${
                    isActiveRow ? 'text-cyan-400' : 'text-mist-700'
                  }`}>
                    L{levelNum}
                  </span>

                  {/* Panels */}
                  <div className="flex gap-1 flex-1">
                    {PANELS.map(panel => {
                      const status = gridRow?.[panel] ?? 'unknown';
                      const s = PANEL_STYLE[status];
                      const clickable = isActiveRow && status === 'unknown';

                      return (
                        <motion.button
                          key={panel}
                          disabled={!clickable}
                          onClick={() => clickable && step(panel)}
                          whileTap={clickable ? { scale: 0.92 } : {}}
                          className={`
                            flex-1 rounded-lg border transition-all flex items-center justify-center
                            ${s.bg} ${s.border} ${s.glow}
                            ${status === 'broken' ? 'opacity-40' : ''}
                            ${clickable
                              ? 'cursor-pointer hover:brightness-125 hover:scale-105 active:scale-95'
                              : 'cursor-default'}
                            ${isActiveRow && status === 'unknown' ? 'animate-pulse-soft' : ''}
                          `}
                          style={{ height: 36 }}
                          title={clickable ? `Step on panel ${panel}` : undefined}
                        >
                          {status === 'unknown' && (
                            <span className={`text-[11px] font-display font-bold ${s.text} ${clickable ? '' : 'opacity-50'}`}>
                              {panel}
                            </span>
                          )}
                          {status === 'safe' && <span className="text-base">✅</span>}
                          {status === 'broken' && <span className="text-base">💔</span>}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Player avatars on this level */}
                  <div className="flex gap-0.5 shrink-0 w-12 justify-end">
                    {playersHere.map(pid => {
                      const idx = state.players.indexOf(pid);
                      const isMe = pid === state.myPlayerId;
                      return (
                        <motion.div
                          key={pid}
                          layoutId={`avatar-${pid}`}
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white"
                          style={{
                            background: PLAYER_COLORS[idx] || '#888',
                            borderColor: isMe ? '#fff' : 'transparent',
                          }}
                        >
                          {isMe ? 'ME' : PLAYER_LABELS[idx]}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Finish platform — top */}
          <div className="rounded-xl bg-emerald-950/40 border border-emerald-700/40 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-display tracking-widest">🏁 FINISH</span>
            <div className="flex gap-0.5">
              {(posByLevel[LEVELS] || []).map(pid => {
                const idx = state.players.indexOf(pid);
                return (
                  <div key={pid}
                    className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: PLAYER_COLORS[idx] || '#888' }}>
                    {pid === state.myPlayerId ? 'ME' : PLAYER_LABELS[idx]}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start platform — bottom */}
          <div className="rounded-xl bg-ink-800/60 border border-ink-700/60 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-mist-600 font-display tracking-widest">▶ START</span>
            <div className="flex gap-0.5">
              {(posByLevel[0] || []).map(pid => {
                const idx = state.players.indexOf(pid);
                return (
                  <div key={pid}
                    className="w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: PLAYER_COLORS[idx] || '#888' }}>
                    {pid === state.myPlayerId ? 'ME' : PLAYER_LABELS[idx]}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Last move line */}
        {lastMoveText && (
          <p className="text-[11px] text-mist-600 text-center shrink-0">{lastMoveText}</p>
        )}

        {/* Log */}
        <div className="text-[10px] text-mist-700 space-y-0.5 shrink-0">
          {state.log.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      </div>

      {/* ── CHAT BAR ──────────────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── MODALS ────────────────────────────────────────────── */}
      {showRules    && <RulesModal onClose={() => setShowRules(false)} />}
      {showSurrender && (
        <SurrenderModal
          onConfirm={() => { restart(); setShowSurrender(false); }}
          onCancel={() => setShowSurrender(false)}
        />
      )}
    </div>
  );
}
