import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, BookOpen, Flag, MessageSquare, Send, X, Smile, AlertTriangle } from 'lucide-react';
import { useGlassBridge } from './useGlassBridge.js';
import QuickReactBar from '../../components/QuickReactBar.jsx';

const LEVELS = 10;
const PANELS = [1, 2, 3, 4];

const PLAYER_COLORS = ['#3576E0', '#E8B93D'];
const PLAYER_LABELS = ['P1', 'P2'];

/* ── Modal wrapper ─────────────────────────────────────────────── */
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }} transition={{ duration: 0.15 }}
        className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {children}
      </motion.div>
    </div>
  );
}

function RulesModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
        <p className="font-display text-[11px] tracking-widest text-cyan-400">GLASS BRIDGE · RULES</p>
        <button onClick={onClose} className="text-mist-600 hover:text-mist-100 cursor-pointer"><X size={14} /></button>
      </div>
      <div className="overflow-y-auto max-h-[65vh] p-4 space-y-3 text-[11.5px] text-mist-400 leading-relaxed">
        <RS t="🎯 Objective">First to cross all 10 levels wins.</RS>
        <RS t="🪟 The Bridge">Each level has 4 panels. Exactly 1 is safe. The other 3 shatter.</RS>
        <RS t="✅ Safe step">Panel flashes green briefly — remember which one it was! You advance to the next level immediately.</RS>
        <RS t="💥 Fall">Panel flashes red. You reset to start. Opponent's turn begins. You must re-walk the entire path from scratch.</RS>
        <RS t="🧠 Memory is everything">Panels reset to unknown after every step. No permanent marks. You must memorise the correct panel at each level yourself.</RS>
        <RS t="♻️ Reusing known paths">If you already crossed a level safely before falling, you know the correct panel — step on it confidently to catch up fast.</RS>
        <RS t="⌨️ Controls">Tap a panel or press 1 / 2 / 3 / 4 on your keyboard.</RS>
      </div>
    </Modal>
  );
}
function RS({ t, children }) {
  return <div><p className="text-mist-200 font-semibold mb-0.5">{t}</p><p>{children}</p></div>;
}

function SurrenderModal({ onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div className="p-5 text-center">
        <Flag size={18} className="text-danger mx-auto mb-3" />
        <p className="text-sm text-mist-100 font-medium mb-1">Give up?</p>
        <p className="text-xs text-mist-500 mb-4">Your opponent wins the round.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-200 cursor-pointer transition-colors">Keep going</button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">Surrender</button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Floating bubbles ───────────────────────────────────────────── */
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
            className="absolute"
            style={{ bottom: '5rem', left: `${b.x}%`, transform: 'translateX(-50%)' }}>
            <div className="rounded-xl rounded-bl-sm bg-ink-800/95 border border-ink-600 px-3 py-1.5 max-w-[160px] shadow-lg">
              <p className="text-[10px] text-mist-600 mb-0.5">{b.name}</p>
              <p className="text-xs text-mist-100 break-words">{b.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function InlineChat({ onSend }) {
  const [v, setV] = useState('');
  function submit(e) { e.preventDefault(); if (!v.trim()) return; onSend(v.trim()); setV(''); }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2 border-t border-ink-700/60 bg-ink-950 shrink-0">
      <MessageSquare size={12} className="text-mist-700 shrink-0" />
      <input value={v} onChange={e => setV(e.target.value)} placeholder="Quick message…" maxLength={200}
        className="flex-1 bg-transparent text-xs text-mist-200 placeholder:text-mist-700 outline-none" />
      <button type="submit" disabled={!v.trim()}
        className="shrink-0 text-mist-600 disabled:opacity-30 hover:text-signal-400 enabled:cursor-pointer transition-colors">
        <Send size={12} />
      </button>
    </form>
  );
}

/* ── Fall flash ─────────────────────────────────────────────────── */
function FallFlash({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.25) 0%, transparent 70%)' }}
        >
          <motion.span
            initial={{ scale: 0.5, opacity: 0, y: 0 }}
            animate={{ scale: 1.4, opacity: 1, y: 40 }}
            transition={{ duration: 0.5, ease: 'easeIn' }}
            className="text-5xl">💥</motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Panel ──────────────────────────────────────────────────────── */
function Panel({ status, panelNum, active, onClick }) {
  const base = 'flex-1 flex items-center justify-center rounded-lg border transition-all select-none relative overflow-hidden';

  if (status === 'safe') return (
    <motion.div
      initial={{ scale: 1, backgroundColor: 'rgba(6,78,59,0.3)' }}
      animate={{ scale: [1, 1.06, 1], backgroundColor: ['rgba(6,78,59,0.3)', 'rgba(16,185,129,0.35)', 'rgba(6,78,59,0.3)'] }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={`${base} border-emerald-500/70`}
      style={{ height: 34, boxShadow: '0 0 12px rgba(52,211,153,0.35)' }}
    >
      <span className="text-base">✅</span>
      {/* Ripple */}
      <motion.div
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 rounded-lg bg-emerald-400/20 pointer-events-none"
      />
    </motion.div>
  );

  if (status === 'broken') return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: [-4, 4, -3, 3, 0] }}
      transition={{ duration: 0.35 }}
      className={`${base} border-red-800/50 bg-red-950/40`}
      style={{ height: 34 }}
    >
      <span className="text-sm">💥</span>
    </motion.div>
  );

  // unknown
  return (
    <motion.button
      whileTap={active ? { scale: 0.91 } : {}}
      onClick={active ? onClick : undefined}
      className={`${base} ${
        active
          ? 'border-cyan-600/70 bg-cyan-950/40 hover:bg-cyan-900/40 hover:border-cyan-500/80 cursor-pointer'
          : 'border-ink-700/30 bg-ink-800/10 cursor-default'
      }`}
      style={{ height: 34 }}
    >
      <span className={`font-display text-sm font-bold tracking-wider ${active ? 'text-cyan-400' : 'text-mist-800'}`}>
        {panelNum}
      </span>
    </motion.button>
  );
}

/* ── Player avatar ──────────────────────────────────────────────── */
function PlayerDot({ pid, state }) {
  const idx = state.players.indexOf(pid);
  const isMe = pid === state.myPlayerId;
  return (
    <div className="w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-bold text-white shrink-0"
      style={{ background: PLAYER_COLORS[idx] || '#888', borderColor: isMe ? '#fff' : 'transparent' }}>
      {isMe ? 'ME' : PLAYER_LABELS[idx]}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function GlassBridgeGame({ roomId, connected, chat }) {
  const { state, waiting, error, step, restart } = useGlassBridge(roomId, connected, chat.socket);
  const [showRules, setShowRules]           = useState(false);
  const [showSurrender, setShowSurrender]   = useState(false);
  const [showEmoji, setShowEmoji]           = useState(false);
  const [chatBubbles, setChatBubbles]       = useState([]);
  const [fallAnim, setFallAnim]             = useState(false);
  const lastMoveRef = useRef(null);
  const lastMsgId   = useRef(null);

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

  // Fall anim
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

  // Chat bubbles
  useEffect(() => {
    if (!chat?.messages?.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.kind !== 'message' || lastMsgId.current === last.id) return;
    lastMsgId.current = last.id;
    const b = { uid: `${last.id}-${Date.now()}`, name: last.senderName, text: last.text, x: 20 + Math.random() * 60 };
    setChatBubbles(p => [...p.slice(-3), b]);
    setTimeout(() => setChatBubbles(p => p.filter(x => x.uid !== b.uid)), 3000);
  }, [chat?.messages]);

  function handleSend(text) {
    chat?.sendMessage?.(text);
    const b = { uid: `own-${Date.now()}`, name: 'You', text, x: 20 + Math.random() * 60 };
    setChatBubbles(p => [...p.slice(-3), b]);
    setTimeout(() => setChatBubbles(p => p.filter(x => x.uid !== b.uid)), 3000);
  }

  if (!connected) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-mist-500 p-6 text-center">
      <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">RECONNECTING…</p>
    </div>
  );
  if (waiting || !state) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-mist-500 p-6 text-center">
      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">{waiting ? 'WAITING FOR OPPONENT' : 'CONNECTING…'}</p>
      {waiting && <p className="text-xs">Bridge builds once your opponent opens the game.</p>}
    </div>
  );

  const myLevel    = state.myPosition ?? 0;
  const isMyTurn   = state.myTurn && !state.winner;
  const posByLevel = {};
  for (const [pid, lvl] of Object.entries(state.positions)) {
    if (!posByLevel[lvl]) posByLevel[lvl] = [];
    posByLevel[lvl].push(pid);
  }

  const lm = state.lastMove;
  const lastMoveText = lm
    ? lm.result === 'safe'
      ? `${lm.playerLabel} → L${lm.level} panel ${lm.panel} ✅`
      : `${lm.playerLabel} fell on L${lm.level} panel ${lm.panel} 💥`
    : null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950 relative">
      <FloatingBubbles bubbles={chatBubbles} />
      <FallFlash show={fallAnim} />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700/60 bg-ink-900/80">
        <button onClick={() => setShowEmoji(v => !v)}
          className="p-1.5 rounded-lg text-mist-600 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
          <Smile size={15} />
        </button>
        <span className="font-display text-[11px] tracking-widest text-cyan-400">GLASS BRIDGE</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-mist-600 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
            <BookOpen size={14} />
          </button>
          <button onClick={() => setShowSurrender(true)}
            className="p-1.5 rounded-lg text-danger/50 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer">
            <Flag size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showEmoji && (
          <div className="absolute top-11 left-3 z-50">
            <QuickReactBar onPick={e => { chat?.sendGameReaction?.(e); setShowEmoji(false); }} />
          </div>
        )}
      </AnimatePresence>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-3 py-2">

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-1.5 shrink-0">
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {/* Game over */}
        {state.winner && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-4 text-center shrink-0">
            <p className="font-display text-[11px] tracking-widest text-cyan-400 mb-1">BRIDGE CROSSED</p>
            <p className="text-sm text-mist-200 mb-3">
              {state.winner === state.myPlayerId ? '🏆 You made it across!' : '😔 Opponent crossed first.'}
            </p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium px-4 py-1.5 hover:bg-cyan-500 cursor-pointer transition-colors">
              <RotateCcw size={12} /> Play again
            </button>
          </motion.div>
        )}

        {/* Turn status bar */}
        <div className={`shrink-0 rounded-xl px-3 py-1.5 text-center transition-all border ${
          isMyTurn
            ? 'border-cyan-700/50 bg-cyan-950/30 text-cyan-400'
            : state.winner
            ? 'border-ink-700/40 bg-ink-800/20 text-mist-600'
            : 'border-ink-700/40 bg-ink-800/20 text-mist-500'
        }`}>
          <p className="text-[10px] font-display tracking-widest">
            {state.winner ? '— GAME OVER —' : isMyTurn ? 'YOUR TURN — CHOOSE A PANEL' : "OPPONENT'S TURN"}
          </p>
        </div>

        {/* Player position pills */}
        <div className="shrink-0 flex gap-2 flex-wrap">
          {state.players.map((pid, idx) => {
            const pos = state.positions[pid] ?? 0;
            const isMe = pid === state.myPlayerId;
            const isActive = state.activePlayerId === pid && !state.winner;
            return (
              <div key={pid}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 border text-[10px] ${
                  isActive ? 'border-cyan-700/50 bg-cyan-950/20' : 'border-ink-700/40 bg-ink-800/20'
                }`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PLAYER_COLORS[idx] }} />
                <span className={isMe ? 'text-mist-200 font-medium' : 'text-mist-400'}>
                  {isMe ? 'You' : 'Opponent'}
                </span>
                <span className="text-mist-600">
                  {pos === 0 ? 'Start' : pos >= LEVELS ? '✓ Done' : `L${pos}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── BRIDGE ─────────────────────────────────────────── */}
        {/* Finish */}
        <div className="shrink-0 rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-3 py-2 flex items-center justify-between">
          <span className="text-[9px] text-emerald-500 font-display tracking-widest">🏁 FINISH</span>
          <div className="flex gap-1">
            {(posByLevel[LEVELS] || []).map(pid => <PlayerDot key={pid} pid={pid} state={state} />)}
          </div>
        </div>

        {/* Levels — bottom-up (level 10 first in DOM so it appears at top) */}
        <div className="flex flex-col gap-1 shrink-0">
          {Array.from({ length: LEVELS }, (_, i) => LEVELS - 1 - i).map(lvlIdx => {
            const levelNum  = lvlIdx + 1;
            const gridRow   = state.grid[lvlIdx];
            const here      = posByLevel[lvlIdx + 1] || [];
            const isActiveRow = isMyTurn && myLevel === lvlIdx;

            return (
              <div key={lvlIdx}
                className={`rounded-xl px-2 py-1 flex items-center gap-2 transition-all ${
                  isActiveRow ? 'bg-cyan-950/40 ring-1 ring-cyan-700/50' : 'bg-ink-900/20'
                }`}>
                {/* Level label */}
                <span className={`font-display text-[9px] w-5 text-right shrink-0 ${
                  isActiveRow ? 'text-cyan-500' : 'text-mist-800'
                }`}>
                  {levelNum}
                </span>

                {/* Panels */}
                <div className="flex gap-1 flex-1">
                  {PANELS.map(p => (
                    <Panel key={p} panelNum={p}
                      status={gridRow?.[p] ?? 'unknown'}
                      active={isActiveRow && (gridRow?.[p] ?? 'unknown') === 'unknown'}
                      onClick={() => step(p)} />
                  ))}
                </div>

                {/* Players here */}
                <div className="flex gap-0.5 w-12 justify-end shrink-0">
                  {here.map(pid => <PlayerDot key={pid} pid={pid} state={state} />)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start */}
        <div className="shrink-0 rounded-xl border border-ink-700/40 bg-ink-800/20 px-3 py-2 flex items-center justify-between">
          <span className="text-[9px] text-mist-700 font-display tracking-widest">▶ START</span>
          <div className="flex gap-1">
            {(posByLevel[0] || []).map(pid => <PlayerDot key={pid} pid={pid} state={state} />)}
          </div>
        </div>

        {/* Last move */}
        {lastMoveText && (
          <p className="text-[11px] text-mist-600 text-center shrink-0">{lastMoveText}</p>
        )}

        {/* Log */}
        <div className="shrink-0 space-y-0.5">
          {state.log.slice(-3).map((l, i) => (
            <p key={i} className="text-[10px] text-mist-700 text-center">{l}</p>
          ))}
        </div>
      </div>

      {/* ── CHAT ───────────────────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── MODALS ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRules     && <RulesModal onClose={() => setShowRules(false)} />}
        {showSurrender && (
          <SurrenderModal onConfirm={() => { restart(); setShowSurrender(false); }} onCancel={() => setShowSurrender(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
