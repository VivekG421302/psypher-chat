import { useEffect, useRef, useState } from 'react';
import { RotateCcw, AlertTriangle, Palette } from 'lucide-react';
import UnoCard from './UnoCard.jsx';
import { useUno } from './useUno.js';

const COLOR_SWATCH = { R: '#D6373F', Y: '#E8B93D', G: '#2E9E63', B: '#3576E0' };
const COLOR_NAMES = { R: 'Red', Y: 'Yellow', G: 'Green', B: 'Blue' };

export default function UnoGame({ roomId, connected }) {
  const { state, waiting, error, playCard, drawCard, callUno, catchUno, restart } = useUno(roomId, connected);
  const [pendingWild, setPendingWild] = useState(null);
  const [colorBanner, setColorBanner] = useState(null);
  const lastSeenColorSeq = useRef(0);

  // Announce every color change to BOTH players with a hard-to-miss banner
  // (not just a line buried in the scrolling log).
  useEffect(() => {
    const change = state?.lastColorChange;
    if (!change || change.seq === lastSeenColorSeq.current) return;
    lastSeenColorSeq.current = change.seq;
    setColorBanner(change);
    const t = setTimeout(() => setColorBanner(null), 3500);
    return () => clearTimeout(t);
  }, [state?.lastColorChange]);

  if (!connected) {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-2 text-mist-500">
        <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin mb-2" />
        <p className="font-display text-sm tracking-widest text-mist-100">RECONNECTING…</p>
        <p className="text-sm">The game will pick back up automatically.</p>
      </div>
    );
  }

  if (waiting || !state) {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-2 text-mist-500">
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
    if (card.color === 'wild') {
      setPendingWild(card);
    } else {
      playCard(card);
    }
  }

  function chooseColor(color) {
    playCard(pendingWild, color);
    setPendingWild(null);
  }

  const myHasUno = state.myHand.length === 1;
  const iCalledUno = state.unoCalled.includes(0) || state.unoCalled.includes(state.playerIndex);

  return (
    <div className="p-4 flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {colorBanner && (
        <div
          className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 border animate-pulse-soft"
          style={{
            borderColor: COLOR_SWATCH[colorBanner.color],
            background: `${COLOR_SWATCH[colorBanner.color]}22`,
            color: '#fff',
          }}
        >
          <Palette size={14} />
          <span>
            <strong>{colorBanner.byLabel}</strong> changed the color to{' '}
            <strong>{colorBanner.colorName}</strong>
          </span>
        </div>
      )}

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

      {/* Opponent — highlighted whenever it's their turn */}
      <div
        className={`flex items-center justify-between rounded-xl transition-all ${
          !state.myTurn && !state.winner ? 'ring-2 ring-danger/60 bg-danger/5 px-2 py-1.5' : 'px-2 py-1.5'
        }`}
      >
        <span className={`text-xs ${!state.myTurn && !state.winner ? 'text-danger font-medium' : 'text-mist-500'}`}>
          Opponent · {state.opponentCount} cards {!state.myTurn && !state.winner ? '· playing now' : ''}
        </span>
        <div className="flex -space-x-6">
          {Array.from({ length: Math.min(state.opponentCount, 7) }).map((_, i) => (
            <UnoCard key={i} faceDown size="sm" />
          ))}
        </div>
      </div>

      {/* Table */}
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

        <div className="flex gap-2">
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

      {/* Log */}
      <div className="text-[11px] text-mist-600 space-y-0.5 max-h-16 overflow-y-auto">
        {state.log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {/* My hand — highlighted whenever it's my turn */}
      <div
        className={`rounded-xl transition-all ${
          state.myTurn && !state.winner ? 'ring-2 ring-cipher-500/60 bg-cipher-700/5 p-2' : 'p-2'
        }`}
      >
        <p className={`text-xs mb-2 ${state.myTurn && !state.winner ? 'text-cipher-500 font-medium' : 'text-mist-500'}`}>
          Your hand · {state.myHand.length} cards {state.myTurn && !state.winner ? '· your move' : ''}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {state.myHand.map((card, i) => (
            <UnoCard key={i} card={card} onClick={() => handleCardClick(card)} disabled={!state.myTurn || !!state.winner} />
          ))}
        </div>
      </div>

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
    </div>
  );
}
