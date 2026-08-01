import { useEffect, useRef, useState, useCallback } from 'react';
import {
  RotateCcw, AlertTriangle, Palette, BookOpen, Eye, EyeOff, X,
  MessageSquare, Send, Lightbulb, LayoutGrid, AlignJustify,
  Flag, Smile,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import UnoCard from './UnoCard.jsx';
import { useUno } from './useUno.js';
import QuickReactBar from '../../components/QuickReactBar.jsx';

const COLOR_SWATCH = { R: '#D6373F', Y: '#E8B93D', G: '#2E9E63', B: '#3576E0' };
const COLOR_NAMES  = { R: 'Red', Y: 'Yellow', G: 'Green', B: 'Blue' };

/* ─── Playability ────────────────────────────────────────────────── */
function isPlayable(card, discardTop, activeColor, pendingDraw = 0) {
  if (pendingDraw > 0) return card.value === '+2' || card.value === 'wild+4';
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (discardTop && card.value === discardTop.value) return true;
  return false;
}

/* ─── Rules Modal ────────────────────────────────────────────────── */
function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <p className="font-display text-xs tracking-widest text-mist-100">UNO · RULES</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-100 cursor-pointer"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 text-[11.5px] text-mist-400 leading-relaxed">
          <RS title="🎯 Objective">Be the first to empty your hand. Call UNO when you drop to 1 card.</RS>
          <RS title="▶️ On your turn">Play a card matching the top card's <b>color</b> or <b>value</b>. Can't play? Draw a card — if it's playable you may play it immediately.</RS>
          <RS title="⚡ Special Cards">
            <ul className="space-y-0.5 mt-1">
              <li><b className="text-mist-200">Skip (Ø)</b> — Opponent loses their turn.</li>
              <li><b className="text-mist-200">Reverse (⇄)</b> — In 2-player acts as Skip.</li>
              <li><b className="text-mist-200">+2</b> — Opponent draws 2 unless they counter with +2 or +4.</li>
              <li><b className="text-mist-200">Wild (★)</b> — You pick the next color.</li>
              <li><b className="text-mist-200">Wild +4</b> — Pick color; opponent draws 4 unless they counter with +4.</li>
            </ul>
          </RS>
          <RS title="🔁 Stacking (Counter)">
            <p>When hit with a <b>+2</b>: counter with another <b>+2</b> or a <b>+4</b> to stack the penalty.</p>
            <p className="mt-1">When hit with a <b>+4</b>: counter only with another <b>+4</b>.</p>
            <p className="mt-1 text-mist-500">The stack grows until someone can't counter — they draw the full total and lose their turn.</p>
          </RS>
          <RS title="📣 UNO">Press <b>Call UNO!</b> when you drop to 1 card before your opponent acts — or get penalised 2 cards.</RS>
          <RS title="🏆 Winning">Play your last card — even a +4. Opponent still draws for score tallying.</RS>
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

/* ─── Hide / Peek toggle ─────────────────────────────────────────── */
const PEEK_MS = 800;
function HideToggle({ hidden, onToggle, onPeekStart, onPeekEnd }) {
  const timer = useRef(null);
  const peeking = useRef(false);

  const down = useCallback(() => {
    peeking.current = false;
    timer.current = setTimeout(() => { peeking.current = true; onPeekStart(); }, PEEK_MS);
  }, [onPeekStart]);

  const up = useCallback(() => {
    clearTimeout(timer.current);
    if (peeking.current) { peeking.current = false; onPeekEnd(); }
    else onToggle();
  }, [onToggle, onPeekEnd]);

  const leave = useCallback(() => {
    clearTimeout(timer.current);
    if (peeking.current) { peeking.current = false; onPeekEnd(); }
  }, [onPeekEnd]);

  return (
    <button
      onPointerDown={down} onPointerUp={up} onPointerLeave={leave}
      className="p-1.5 rounded-lg text-mist-400 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer select-none"
      title={hidden ? 'Show cards (hold to peek)' : 'Hide cards'}
    >
      {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
    </button>
  );
}

/* ─── Surrender confirm ──────────────────────────────────────────── */
function SurrenderModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 p-5 w-full max-w-xs text-center"
        onClick={e => e.stopPropagation()}>
        <Flag size={22} className="text-danger mx-auto mb-3" />
        <p className="text-sm text-mist-100 font-medium mb-1">Accept defeat?</p>
        <p className="text-xs text-mist-500 mb-4">You'll concede this round to your opponent.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-100 cursor-pointer transition-colors">
            Keep fighting
          </button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">
            I surrender
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function UnoGame({ roomId, connected, onClose, chat }) {
  const { state, waiting, error, playCard, drawCard, callUno, catchUno, restart } = useUno(roomId, connected);

  const [pendingWild, setPendingWild]   = useState(null);
  const [colorBanner, setColorBanner]   = useState(null);
  const [showRules, setShowRules]       = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);
  const [hintsOn, setHintsOn]           = useState(false);
  const [cardsHidden, setCardsHidden]   = useState(false);
  const [isPeeking, setIsPeeking]       = useState(false);
  const [layout, setLayout]             = useState('row');  // 'row' | 'grid'
  const [showEmoji, setShowEmoji]       = useState(false);
  const [chatBubbles, setChatBubbles]   = useState([]);
  const lastSeenColorSeq = useRef(0);
  const lastSeenMsgId    = useRef(null);

  // Color change banner
  useEffect(() => {
    const change = state?.lastColorChange;
    if (!change || change.seq === lastSeenColorSeq.current) return;
    lastSeenColorSeq.current = change.seq;
    setColorBanner(change);
    const t = setTimeout(() => setColorBanner(null), 3000);
    return () => clearTimeout(t);
  }, [state?.lastColorChange]);

  // Incoming chat → floating bubble
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
    setChatBubbles(b => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles(b => b.filter(x => x.uid !== bubble.uid)), 3000);
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
      {waiting && <p className="text-xs">Cards deal once opponent opens UNO.</p>}
    </div>
  );

  function handleCardClick(card) {
    if (!state.myTurn || state.winner) return;
    if (card.color === 'wild') setPendingWild(card);
    else playCard(card);
  }

  function chooseColor(color) {
    playCard(pendingWild, color);
    setPendingWild(null);
  }

  function handleSend(text) {
    chat?.sendMessage?.(text);
    // Also show own bubble
    const bubble = { uid: `own-${Date.now()}`, name: 'You', text, x: 25 + Math.random() * 50 };
    setChatBubbles(b => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles(b => b.filter(x => x.uid !== bubble.uid)), 3000);
  }

  const myHasUno  = state.myHand.length === 1;
  const iCalledUno = state.unoCalled.includes(0) || state.unoCalled.includes(state.playerIndex);
  const pendingDraw = state.pendingDraw ?? 0;

  const playableSet = hintsOn && state.myTurn && !state.winner
    ? new Set(state.myHand.map((c, i) => isPlayable(c, state.discardTop, state.activeColor, pendingDraw) ? i : -1).filter(i => i !== -1))
    : new Set();

  const showCards = !cardsHidden || isPeeking;

  // Last move text
  const lastMove = state.lastMove;
  const lastMoveText = lastMove
    ? lastMove.drawPenalty
      ? `${lastMove.playerLabel} drew ${lastMove.drawPenalty} cards`
      : `${lastMove.playerLabel} played ${lastMove.card?.color === 'wild' ? '' : lastMove.card?.color + ' '}${lastMove.card?.value}`
    : null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950">

      {/* ── 1. HEADER ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700 bg-ink-900">
        {/* Left: chat icon */}
        <button
          onClick={() => setShowEmoji(v => !v)}
          className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
          title="Quick reactions"
        >
          <Smile size={16} />
        </button>

        {/* Center: title */}
        <div className="flex items-center gap-2">
          <span className="font-display text-xs tracking-widest text-mist-100">UNO</span>
          {pendingDraw > 0 && (
            <span className="text-[10px] bg-danger/20 border border-danger/40 text-danger rounded-full px-2 py-0.5 font-medium animate-pulse">
              +{pendingDraw} PENDING
            </span>
          )}
        </div>

        {/* Right: rules + surrender */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
            title="Rules"
          >
            <BookOpen size={15} />
          </button>
          <button
            onClick={() => setShowSurrender(true)}
            className="p-1.5 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title="Concede game"
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
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 px-3 py-2.5 relative">
        <FloatingChatBubbles bubbles={chatBubbles} />

        {/* Error toast */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 shrink-0">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* Color change banner */}
        {colorBanner && (
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 border shrink-0"
            style={{ borderColor: COLOR_SWATCH[colorBanner.color], background: `${COLOR_SWATCH[colorBanner.color]}22`, color: '#fff' }}>
            <Palette size={13} />
            <span><b>{colorBanner.byLabel}</b> → <b>{colorBanner.colorName}</b></span>
          </div>
        )}

        {/* Game over */}
        {state.winner && (
          <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center shrink-0">
            <p className="font-display text-xs text-signal-500 mb-1">GAME OVER</p>
            <p className="text-sm text-mist-100 mb-3">{state.log[state.log.length - 1] || 'Round finished.'}</p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-3 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
              <RotateCcw size={13} /> Play again
            </button>
          </div>
        )}

        {/* ── 2. OPPONENT ──────────────────────────────────────────── */}
        <div className={`shrink-0 flex items-center justify-between rounded-xl px-2.5 py-2 transition-all ${
          !state.myTurn && !state.winner ? 'ring-1 ring-danger/50 bg-danger/5' : 'bg-ink-800/40'
        }`}>
          <span className={`text-xs ${!state.myTurn && !state.winner ? 'text-danger font-medium' : 'text-mist-500'}`}>
            Opponent · {state.opponentCount} cards{!state.myTurn && !state.winner ? ' · their turn' : ''}
          </span>
          <div className="flex -space-x-5">
            {Array.from({ length: Math.min(state.opponentCount, 8) }).map((_, i) => (
              <UnoCard key={i} faceDown size="sm" />
            ))}
          </div>
        </div>

        {/* ── 3. PLAYGROUND (table) ────────────────────────────────── */}
        <div className="shrink-0 rounded-2xl border border-ink-700 bg-ink-800/50 p-3 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <UnoCard faceDown />
              <span className="text-[10px] text-mist-600">{state.deckCount} left</span>
            </div>
            {state.discardTop && (
              <div className="flex flex-col items-center gap-1">
                <UnoCard card={state.discardTop} />
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full border border-white/30"
                    style={{ background: COLOR_SWATCH[state.activeColor] || '#888' }} />
                  <span className="text-[10px] text-mist-600">{COLOR_NAMES[state.activeColor] || state.activeColor}</span>
                </span>
              </div>
            )}
          </div>

          <p className={`text-[11px] font-display tracking-widest px-3 py-0.5 rounded-full ${
            state.myTurn ? 'text-cipher-500 bg-cipher-700/10' : 'text-danger bg-danger/10'
          }`}>
            {state.myTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            <button onClick={drawCard} disabled={!state.myTurn || !!state.winner}
              className={`text-[11px] rounded-lg border px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors ${
                pendingDraw > 0 && state.myTurn
                  ? 'border-danger/60 text-danger bg-danger/10 hover:bg-danger/20 font-medium'
                  : 'border-ink-600 text-mist-300 hover:border-signal-500/50'
              }`}>
              {pendingDraw > 0 && state.myTurn ? `Draw ${pendingDraw}` : 'Draw'}
            </button>
            <button onClick={callUno} disabled={!myHasUno || iCalledUno || !!state.winner}
              className="text-[11px] rounded-lg border border-signal-500/50 px-2.5 py-1 text-signal-500 hover:bg-signal-700/10 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors">
              UNO!
            </button>
            <button onClick={catchUno} disabled={!!state.winner}
              className="text-[11px] rounded-lg border border-danger/40 px-2.5 py-1 text-danger/80 hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors">
              Catch
            </button>
          </div>
        </div>

        {/* ── 4. LAST MOVE + HINTS ─────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-0.5">
          <p className="text-[11px] text-mist-600 truncate flex-1">
            {lastMoveText || (state.log[state.log.length - 1] || '—')}
          </p>
          <button
            onClick={() => setHintsOn(h => !h)}
            className={`shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${
              hintsOn ? 'text-signal-400 bg-signal-700/15' : 'text-mist-600 hover:text-mist-300'
            }`}
            title="Toggle playable card hints"
          >
            <Lightbulb size={15} />
          </button>
        </div>
      </div>

      {/* ── 5. MY HAND ─────────────────────────────────────────────── */}
      <div className={`shrink-0 border-t transition-all ${
        state.myTurn && !state.winner ? 'border-cipher-500/30 bg-cipher-700/5' : 'border-ink-700/60 bg-ink-900'
      }`}>
        {/* Hand header */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <p className={`text-[11px] ${state.myTurn && !state.winner ? 'text-cipher-500 font-medium' : 'text-mist-500'}`}>
            Your hand · {state.myHand.length}{state.myTurn && !state.winner ? ' · your move' : ''}
            {isPeeking && <span className="ml-1 text-signal-400">(peek)</span>}
          </p>
          <div className="flex items-center gap-0.5">
            {/* Layout toggle */}
            <button
              onClick={() => setLayout(l => l === 'row' ? 'grid' : 'row')}
              className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
              title={layout === 'row' ? 'Grid layout' : 'Row layout'}
            >
              {layout === 'row' ? <LayoutGrid size={14} /> : <AlignJustify size={14} />}
            </button>
            {/* Hide/peek toggle */}
            <HideToggle
              hidden={cardsHidden}
              onToggle={() => setCardsHidden(h => !h)}
              onPeekStart={() => setIsPeeking(true)}
              onPeekEnd={() => setIsPeeking(false)}
            />
          </div>
        </div>

        {/* Cards */}
        {layout === 'row' ? (
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 pt-0.5 no-scrollbar">
            {state.myHand.map((card, i) => {
              const playable = playableSet.has(i);
              return (
                <div key={i} className="relative shrink-0">
                  {showCards
                    ? <UnoCard card={card} onClick={() => handleCardClick(card)}
                        disabled={!state.myTurn || !!state.winner} highlighted={playable} />
                    : <UnoCard faceDown />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5 px-3 pb-2.5 pt-0.5 max-h-40 overflow-y-auto">
            {state.myHand.map((card, i) => {
              const playable = playableSet.has(i);
              return (
                <div key={i} className="relative">
                  {showCards
                    ? <UnoCard card={card} onClick={() => handleCardClick(card)}
                        disabled={!state.myTurn || !!state.winner} highlighted={playable} size="sm" />
                    : <UnoCard faceDown size="sm" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 6. FLOATING CHAT BAR ──────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {pendingWild && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-ink-600 bg-ink-800 p-4 w-full max-w-xs text-center">
            <p className="text-sm text-mist-100 mb-3">Choose a color</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(COLOR_SWATCH).map(([key, hex]) => (
                <button key={key} onClick={() => chooseColor(key)}
                  style={{ background: hex }}
                  className="rounded-xl py-3 text-white text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                  {COLOR_NAMES[key]}
                </button>
              ))}
            </div>
            <button onClick={() => setPendingWild(null)} className="mt-3 text-xs text-mist-500 hover:text-mist-100 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showSurrender && (
        <SurrenderModal
          onConfirm={() => { restart(); setShowSurrender(false); }}
          onCancel={() => setShowSurrender(false)}
        />
      )}
    </div>
  );
}
