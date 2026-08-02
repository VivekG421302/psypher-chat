import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw, AlertTriangle, BookOpen, X, MessageSquare, Send, Flag, Smile, Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTicTacToe } from './useTicTacToe.js';
import QuickReactBar from '../../components/QuickReactBar.jsx';

/* ─── Rules Modal ────────────────────────────────────────────────── */
function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <p className="font-display text-xs tracking-widest text-mist-100">TIC-TAC-TOE · RULES</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-100 cursor-pointer"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 text-[11.5px] text-mist-400 leading-relaxed">
          <RS title="🎯 Objective">Be the first to get three of your marks in a row — horizontally, vertically, or diagonally.</RS>
          <RS title="▶️ On your turn">Tap any empty cell to place your mark. You're always X or O — the app assigns it and remembers it for the whole match.</RS>
          <RS title="🔁 Rematches">Whoever wins gets bragging rights; a draw is still a completed round. Either player can start a rematch, and who goes first alternates each round so it stays fair.</RS>
          <RS title="🏆 Winning">First to three in a row wins instantly — the board highlights the winning line.</RS>
        </div>
      </div>
    </div>
  );
}
function RS({ title, children }) {
  return <div><p className="text-mist-200 font-semibold mb-1">{title}</p><div>{children}</div></div>;
}

/* ─── Floating chat bubble ───────────────────────────────────────── */
function FloatingChatBubbles({ bubbles }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {bubbles.map((b) => (
          <motion.div
            key={b.uid}
            initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.85 }}
            animate={{ opacity: 1, y: -60, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -120, x: '-50%', scale: 0.8 }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
            className="absolute bottom-24 left-1/2"
            style={{ left: `${b.x}%`, transform: 'translateX(-50%)' }}
          >
            <div className="rounded-xl rounded-bl-sm bg-ink-700/95 border border-ink-500 px-3 py-1.5 shadow-lg max-w-[180px]">
              <p className="text-[10px] text-mist-500 leading-none mb-0.5">{b.name}</p>
              <p className="text-xs text-mist-100 break-words leading-snug">{b.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Inline chat bar ────────────────────────────────────────────── */
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
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Quick message…"
        maxLength={200}
        className="flex-1 bg-transparent text-xs text-mist-200 placeholder:text-mist-700 outline-none"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="shrink-0 text-mist-500 disabled:opacity-30 hover:text-signal-400 enabled:cursor-pointer transition-colors"
      >
        <Send size={13} />
      </button>
    </form>
  );
}

/* ─── Concede confirm ────────────────────────────────────────────── */
function ConcedeModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 p-5 w-full max-w-xs text-center"
        onClick={e => e.stopPropagation()}>
        <Flag size={22} className="text-danger mx-auto mb-3" />
        <p className="text-sm text-mist-100 font-medium mb-1">Start over?</p>
        <p className="text-xs text-mist-500 mb-4">This resets the board and starts a fresh round.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-100 cursor-pointer transition-colors">
            Keep playing
          </button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Board cell ──────────────────────────────────────────────────── */
function Cell({ value, onClick, disabled, isWinning }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !!value}
      className={`aspect-square rounded-xl border flex items-center justify-center font-display font-bold text-3xl transition-all disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:-translate-y-0.5 ${
        isWinning
          ? 'border-signal-500 bg-signal-700/15 text-signal-500'
          : value === 'X'
            ? 'border-ink-600 bg-ink-800/60 text-cipher-500'
            : value === 'O'
              ? 'border-ink-600 bg-ink-800/60 text-signal-500'
              : 'border-ink-700 bg-ink-800/30 text-transparent hover:border-cipher-500/40'
      }`}
    >
      {value}
    </button>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function TicTacToeGame({ roomId, identity, connected, chat }) {
  const { state, waiting, error, makeMove, restart } = useTicTacToe(roomId, connected);

  const [showRules, setShowRules] = useState(false);
  const [showConcede, setShowConcede] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [chatBubbles, setChatBubbles] = useState([]);
  const lastSeenMsgId = useRef(null);

  // Incoming chat → floating bubble, so you never have to leave the board
  // to see what your opponent just said.
  useEffect(() => {
    if (!chat?.messages?.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.kind !== 'message' || lastSeenMsgId.current === last.id) return;
    lastSeenMsgId.current = last.id;
    const bubble = {
      uid: `${last.id}-${Date.now()}`,
      name: last.senderName,
      text: last.text,
      x: 25 + Math.random() * 50,
    };
    setChatBubbles((b) => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles((b) => b.filter((x) => x.uid !== bubble.uid)), 3000);
  }, [chat?.messages]);

  /* ── loading states ── */
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
      {waiting && <p className="text-xs">The board deals in as soon as your opponent opens Tic-Tac-Toe too.</p>}
    </div>
  );

  function handleSend(text) {
    chat?.sendMessage?.(text);
    const bubble = { uid: `own-${Date.now()}`, name: 'You', text, x: 25 + Math.random() * 50 };
    setChatBubbles((b) => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles((b) => b.filter((x) => x.uid !== bubble.uid)), 3000);
  }

  const winningSet = new Set(state.winningLine || []);
  const isDraw = state.winner === 'draw';
  const iWon = state.winner && state.winner !== 'draw' && state.winner === identity?.userId;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700 bg-ink-900">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
          title="Quick reactions"
        >
          <Smile size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-xs tracking-widest text-mist-100">TIC-TAC-TOE</span>
          <span className="text-[10px] bg-cipher-700/15 border border-cipher-700/40 text-cipher-500 rounded-full px-2 py-0.5 font-medium">
            {state.scores.mine} – {state.scores.opponent}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
            title="Rules"
          >
            <BookOpen size={15} />
          </button>
          <button
            onClick={() => setShowConcede(true)}
            className="p-1.5 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title="Restart round"
          >
            <Flag size={15} />
          </button>
        </div>
      </div>

      {/* Emoji picker overlay */}
      <AnimatePresence>
        {showEmoji && (
          <div className="absolute top-12 left-3 z-50">
            <QuickReactBar
              onPick={(emoji) => {
                chat?.sendGameReaction?.(emoji);
                setShowEmoji(false);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ── Scrollable middle ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 px-3 py-2.5 relative">
        <FloatingChatBubbles bubbles={chatBubbles} />

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 shrink-0">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* My symbol */}
        <div className="shrink-0 flex items-center gap-3 rounded-xl border border-cipher-700/40 bg-cipher-700/5 px-3 py-2.5">
          <div className={`w-10 h-10 rounded-lg bg-ink-900/60 border border-cipher-700/30 flex items-center justify-center shrink-0 font-display font-bold text-xl ${
            state.mySymbol === 'X' ? 'text-cipher-500' : 'text-signal-500'
          }`}>
            {state.mySymbol}
          </div>
          <p className="text-sm text-mist-100">You're playing <b>{state.mySymbol}</b> this round</p>
        </div>

        {/* Turn indicator */}
        {!state.winner && (
          <div className={`shrink-0 flex items-center justify-center rounded-xl px-2.5 py-2 transition-all ${
            !state.myTurn ? 'ring-1 ring-danger/50 bg-danger/5' : 'ring-1 ring-cipher-500/40 bg-cipher-700/5'
          }`}>
            <p className={`text-[11px] font-display tracking-widest px-2.5 py-0.5 rounded-full ${
              state.myTurn ? 'text-cipher-500 bg-cipher-700/10' : 'text-danger bg-danger/10'
            }`}>
              {state.myTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
            </p>
          </div>
        )}

        {/* Game over banner */}
        {state.winner && (
          <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center shrink-0">
            <Sparkles size={18} className="text-signal-500 mx-auto mb-1" />
            <p className="font-display text-xs text-signal-500 mb-1">
              {isDraw ? "IT'S A DRAW" : iWon ? 'YOU WIN' : 'OPPONENT WINS'}
            </p>
            <p className="text-sm text-mist-100 mb-3">{state.log[state.log.length - 1] || 'Round finished.'}</p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-3 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
              <RotateCcw size={13} /> Play again
            </button>
          </div>
        )}

        {/* Board */}
        <div className="shrink-0 grid grid-cols-3 gap-2 max-w-xs mx-auto w-full">
          {state.board.map((cell, i) => (
            <Cell
              key={i}
              value={cell}
              isWinning={winningSet.has(i)}
              disabled={!state.myTurn || !!state.winner}
              onClick={() => makeMove(i)}
            />
          ))}
        </div>

        {/* Log */}
        <div className="shrink-0 rounded-lg border border-ink-700/60 bg-ink-800/20 px-3 py-2">
          <p className="text-[10px] text-mist-600 mb-1">Recent activity</p>
          <div className="space-y-0.5">
            {state.log.slice(-4).map((l, i) => (
              <p key={i} className="text-[11px] text-mist-500 leading-snug">{l}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── CHAT BAR ───────────────────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showConcede && (
        <ConcedeModal
          onConfirm={() => { restart(); setShowConcede(false); }}
          onCancel={() => setShowConcede(false)}
        />
      )}
    </div>
  );
}
