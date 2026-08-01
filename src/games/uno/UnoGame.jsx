import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, AlertTriangle, Palette, BookOpen, Eye, EyeOff, X } from 'lucide-react';
import UnoCard from './UnoCard.jsx';
import { useUno } from './useUno.js';

const COLOR_SWATCH = { R: '#D6373F', Y: '#E8B93D', G: '#2E9E63', B: '#3576E0' };
const COLOR_NAMES = { R: 'Red', Y: 'Yellow', G: 'Green', B: 'Blue' };

/* ── Playability check ─────────────────────────────────────────── */
function isPlayable(card, discardTop, activeColor) {
  if (!discardTop) return true;
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.value === discardTop.value) return true;
  return false;
}

/* ── Rules Modal ───────────────────────────────────────────────── */
function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700">
          <p className="font-display text-sm tracking-widest text-mist-100">UNO · RULES</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-100 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-[12px] text-mist-400 leading-relaxed">
          <Section title="🎯 Objective">
            Be the first to empty your hand. Call <em>UNO</em> when you drop to 1 card or get penalised.
          </Section>
          <Section title="▶️ Basic Turn">
            Play a card matching the top card's <strong>color</strong> or <strong>value</strong>.
            If you can't play, draw a card. You may play the drawn card immediately if it's valid.
          </Section>
          <Section title="⚡ Special Cards">
            <ul className="space-y-1 mt-1">
              <li><span className="text-mist-200 font-semibold">Skip (Ø)</span> — Next player loses their turn.</li>
              <li><span className="text-mist-200 font-semibold">Reverse (⇄)</span> — Flips turn direction.</li>
              <li><span className="text-mist-200 font-semibold">Draw Two (+2)</span> — Next player draws 2 and loses their turn.</li>
              <li><span className="text-mist-200 font-semibold">Wild (★)</span> — You pick the next color.</li>
              <li><span className="text-mist-200 font-semibold">Wild Draw Four (+4)</span> — You pick color; next player draws 4 and loses turn.</li>
            </ul>
          </Section>
          <Section title="🔁 Stacking">
            <p>+2 and +4 can be countered by the next player with the same card type. Penalty accumulates until someone can't counter.</p>
            <p className="mt-1 text-mist-500">+4 can only be countered by +4. +2 can only be countered by +2.</p>
          </Section>
          <Section title="📣 UNO Call">
            Press <strong>Call UNO!</strong> when you drop to 1 card — before your opponent takes their next action.
            Any player can press <strong>Catch missed UNO</strong> to penalise a forgetful player.
          </Section>
          <Section title="🃏 First Card">
            <ul className="space-y-1 mt-1">
              <li><span className="text-mist-200">Wild +4 flipped first</span> → reshuffled, new card drawn.</li>
              <li><span className="text-mist-200">Wild flipped first</span> → player left of dealer picks starting color.</li>
              <li><span className="text-mist-200">Skip / Reverse / +2 flipped first</span> → first player suffers the effect immediately.</li>
            </ul>
          </Section>
          <Section title="🏆 Winning">
            Play your last card to win. Wild +4 as last card still wins — opponent draws for score tallying.
            A 0 or 7 played last wins before any swap triggers.
          </Section>
          <Section title="🔄 Deck Depletion">
            When the draw pile empties, the discard pile (except top card) is reshuffled into a new deck.
            If total cards can't satisfy a penalty, the player draws all that remain.
          </Section>
          <Section title="💡 Hints">
            Tap <strong>Hints</strong> to highlight every card in your hand that is currently playable.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-mist-200 font-semibold mb-1">{title}</p>
      <div>{children}</div>
    </div>
  );
}

/* ── Hide / Peek / Show button ─────────────────────────────────── */
const PEEK_THRESHOLD_MS = 800;

function HideToggle({ hidden, onToggle, onPeekStart, onPeekEnd }) {
  const peekTimer = useRef(null);
  const isPeeking = useRef(false);

  const handlePointerDown = useCallback(() => {
    isPeeking.current = false;
    peekTimer.current = setTimeout(() => {
      isPeeking.current = true;
      onPeekStart();
    }, PEEK_THRESHOLD_MS);
  }, [onPeekStart]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(peekTimer.current);
    if (isPeeking.current) {
      isPeeking.current = false;
      onPeekEnd();
    } else {
      onToggle();
    }
  }, [onToggle, onPeekEnd]);

  const handlePointerLeave = useCallback(() => {
    clearTimeout(peekTimer.current);
    if (isPeeking.current) {
      isPeeking.current = false;
      onPeekEnd();
    }
  }, [onPeekEnd]);

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="text-xs rounded-lg border border-ink-600 px-2.5 py-1.5 text-mist-300 hover:border-mist-400/60 cursor-pointer transition-colors flex items-center gap-1.5 select-none"
      title={hidden ? 'Show cards (hold to peek)' : 'Hide cards'}
    >
      {hidden ? <Eye size={12} /> : <EyeOff size={12} />}
      {hidden ? 'Show' : 'Hide'}
    </button>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export default function UnoGame({ roomId, connected }) {
  const { state, waiting, error, playCard, drawCard, callUno, catchUno, restart } = useUno(roomId, connected);
  const [pendingWild, setPendingWild] = useState(null);
  const [colorBanner, setColorBanner] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [hintsOn, setHintsOn] = useState(false);
  const [cardsHidden, setCardsHidden] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const lastSeenColorSeq = useRef(0);

  useEffect(() => {
    const change = state?.lastColorChange;
    if (!change || change.seq === lastSeenColorSeq.current) return;
    lastSeenColorSeq.current = change.seq;
    setColorBanner(change);
    const t = setTimeout(() => setColorBanner(null), 3500);
    return () => clearTimeout(t);
  }, [state?.lastColorChange]);

  /* ── Loading / waiting states ── */
  if (!connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-mist-500 p-6">
        <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin mb-2" />
        <p className="font-display text-sm tracking-widest text-mist-100">RECONNECTING…</p>
        <p className="text-sm">The game will pick back up automatically.</p>
      </div>
    );
  }

  if (waiting || !state) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-mist-500 p-6">
        <div className="w-6 h-6 border-2 border-signal-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="font-display text-sm tracking-widest text-mist-100">
          {waiting ? 'WAITING FOR OPPONENT' : 'CONNECTING…'}
        </p>
        {waiting && <p className="text-sm">Cards deal automatically once they open UNO too.</p>}
      </div>
    );
  }

  function handleCardClick(card) {
    if (!state.myTurn || state.winner) return;
    if (card.color === 'wild') setPendingWild(card);
    else playCard(card);
  }

  function chooseColor(color) {
    playCard(pendingWild, color);
    setPendingWild(null);
  }

  const myHasUno = state.myHand.length === 1;
  const iCalledUno = state.unoCalled.includes(0) || state.unoCalled.includes(state.playerIndex);

  const playableSet = hintsOn && state.myTurn && !state.winner
    ? new Set(
        state.myHand
          .map((card, i) => isPlayable(card, state.discardTop, state.activeColor) ? i : -1)
          .filter(i => i !== -1)
      )
    : new Set();

  const showCards = !cardsHidden || isPeeking;

  /*
   * Layout intent:
   *   The game fills the exact height given by the drawer (flex-1 min-h-0).
   *   Inside we have three vertically stacked, non-growing zones:
   *     1. Opponent row       — shrink-0
   *     2. Table (scrollable) — flex-1 min-h-0, scrolls internally if somehow squished
   *     3. Hand area          — shrink-0, always pinned to the bottom
   *
   *   The game-log sits INSIDE the table zone, not between table and hand,
   *   so incoming chat messages (InGameChat below the drawer) can never
   *   reflow the card row.
   */
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Toasts / banners (absolute, don't affect layout) ──────── */}
      <div className="relative shrink-0">
        {error && (
          <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 mx-4 mt-3">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        {colorBanner && (
          <div
            className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 border mx-4 mt-2"
            style={{
              borderColor: COLOR_SWATCH[colorBanner.color],
              background: `${COLOR_SWATCH[colorBanner.color]}22`,
              color: '#fff',
            }}
          >
            <Palette size={14} />
            <span>
              <strong>{colorBanner.byLabel}</strong> changed color to{' '}
              <strong>{colorBanner.colorName}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── 1. Opponent row ───────────────────────────────────────── */}
      <div
        className={`shrink-0 flex items-center justify-between rounded-xl mx-4 mt-3 transition-all ${
          !state.myTurn && !state.winner
            ? 'ring-2 ring-danger/60 bg-danger/5 px-2 py-1.5'
            : 'px-2 py-1.5'
        }`}
      >
        <span className={`text-xs ${!state.myTurn && !state.winner ? 'text-danger font-medium' : 'text-mist-500'}`}>
          Opponent · {state.opponentCount} cards{!state.myTurn && !state.winner ? ' · playing now' : ''}
        </span>
        <div className="flex -space-x-6">
          {Array.from({ length: Math.min(state.opponentCount, 7) }).map((_, i) => (
            <UnoCard key={i} faceDown size="sm" />
          ))}
        </div>
      </div>

      {/* ── 2. Table + log (scrollable middle) ───────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">

        {/* Game over banner */}
        {state.winner && (
          <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center">
            <p className="font-display text-sm text-signal-500 mb-2">GAME OVER</p>
            <p className="text-sm text-mist-100 mb-3">
              {state.log[state.log.length - 1] || 'Round finished.'}
            </p>
            <button
              onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-sm font-medium px-3 py-1.5 hover:bg-signal-300 enabled:cursor-pointer transition-colors"
            >
              <RotateCcw size={14} /> Play again
            </button>
          </div>
        )}

        {/* Table surface */}
        <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <UnoCard faceDown />
              <span className="text-[10px] text-mist-600">{state.deckCount} left</span>
            </div>
            {state.discardTop && (
              <div className="flex flex-col items-center gap-1">
                <UnoCard card={state.discardTop} />
                <span className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full border border-white/30"
                    style={{ background: COLOR_SWATCH[state.activeColor] || '#888' }}
                  />
                  <span className="text-[10px] text-mist-600">{COLOR_NAMES[state.activeColor] || state.activeColor}</span>
                </span>
              </div>
            )}
          </div>

          <p
            className={`text-xs font-display tracking-widest px-3 py-1 rounded-full ${
              state.myTurn ? 'text-cipher-500 bg-cipher-700/10' : 'text-danger bg-danger/10'
            }`}
          >
            {state.myTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={drawCard}
              disabled={!state.myTurn || !!state.winner}
              className="text-xs rounded-lg border border-ink-600 px-3 py-1.5 text-mist-300 hover:border-signal-500/60 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors"
            >
              Draw card
            </button>
            <button
              onClick={callUno}
              disabled={!myHasUno || iCalledUno || !!state.winner}
              className="text-xs rounded-lg border border-signal-500/50 px-3 py-1.5 text-signal-500 hover:bg-signal-700/10 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors"
            >
              Call UNO!
            </button>
            <button
              onClick={catchUno}
              disabled={!!state.winner}
              className="text-xs rounded-lg border border-danger/50 px-3 py-1.5 text-danger hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors"
            >
              Catch missed UNO
            </button>
          </div>
        </div>

        {/* Game log — lives in the scrollable middle, never between table and hand */}
        {state.log.length > 0 && (
          <div className="text-[11px] text-mist-600 space-y-0.5">
            {state.log.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. My hand — always pinned to the bottom ─────────────── */}
      <div
        className={`shrink-0 border-t border-ink-700/60 transition-all ${
          state.myTurn && !state.winner
            ? 'ring-2 ring-cipher-500/40 bg-cipher-700/5'
            : 'bg-ink-900'
        }`}
      >
        {/* Hand header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1 gap-2 flex-wrap">
          <p className={`text-xs ${state.myTurn && !state.winner ? 'text-cipher-500 font-medium' : 'text-mist-500'}`}>
            Your hand · {state.myHand.length} cards
            {state.myTurn && !state.winner ? ' · your move' : ''}
            {isPeeking && <span className="ml-1 text-signal-500">(peeking)</span>}
          </p>

          <div className="flex items-center gap-1.5">
            {/* Hints */}
            <button
              onClick={() => setHintsOn(h => !h)}
              className={`text-xs rounded-lg border px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1 ${
                hintsOn
                  ? 'border-signal-500/70 text-signal-400 bg-signal-700/10'
                  : 'border-ink-600 text-mist-500 hover:border-mist-500/50'
              }`}
              title="Highlight playable cards"
            >
              💡 {hintsOn ? 'On' : 'Hints'}
            </button>

            {/* Hide / Peek / Show */}
            <HideToggle
              hidden={cardsHidden}
              onToggle={() => setCardsHidden(h => !h)}
              onPeekStart={() => setIsPeeking(true)}
              onPeekEnd={() => setIsPeeking(false)}
            />

            {/* Rules */}
            <button
              onClick={() => setShowRules(true)}
              className="text-xs rounded-lg border border-ink-600 px-2.5 py-1 text-mist-500 hover:border-mist-500/50 cursor-pointer transition-colors flex items-center gap-1"
              title="View rules"
            >
              <BookOpen size={11} /> Rules
            </button>
          </div>
        </div>

        {/* Card strip — horizontal scroll, never wraps, never pushes layout */}
        <div className="flex gap-2 overflow-x-auto px-3 pb-3 pt-1 no-scrollbar">
          {state.myHand.map((card, i) => {
            const playable = playableSet.has(i);
            if (!showCards) {
              return <UnoCard key={i} faceDown />;
            }
            return (
              <div key={i} className="relative flex flex-col items-center shrink-0">
                <UnoCard
                  card={card}
                  onClick={() => handleCardClick(card)}
                  disabled={!state.myTurn || !!state.winner}
                  highlighted={playable}
                />
                {hintsOn && playable && (
                  <span className="absolute -bottom-3 text-[9px] text-signal-400 font-semibold pointer-events-none">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Color picker modal */}
      {pendingWild && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5 w-full max-w-xs text-center">
            <p className="text-sm text-mist-100 mb-4">Choose a color</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(COLOR_SWATCH).map(([key, hex]) => (
                <button
                  key={key}
                  onClick={() => chooseColor(key)}
                  style={{ background: hex }}
                  className="rounded-lg py-3 text-white text-sm font-semibold enabled:cursor-pointer"
                >
                  {COLOR_NAMES[key]}
                </button>
              ))}
            </div>
            <button onClick={() => setPendingWild(null)} className="mt-3 text-xs text-mist-500 hover:text-mist-100 enabled:cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
