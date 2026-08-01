import { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import UnoCard from './UnoCard.jsx';
import { useUno } from './useUno.js';

const COLOR_SWATCH = { R: '#D6373F', Y: '#E8B93D', G: '#2E9E63', B: '#3576E0' };

export default function UnoGame({ roomId, connected }) {
  const { state, waiting, error, playCard, drawCard, callUno, catchUno, restart } = useUno(roomId, connected);
  const [pendingWild, setPendingWild] = useState(null);

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

      {state.winner && (
        <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center">
          <p className="font-display text-sm text-signal-500 mb-2">GAME OVER</p>
          <p className="text-sm text-mist-100 mb-3">
            {state.log[state.log.length - 1] || 'Round finished.'}
          </p>
          <button
            onClick={restart}
            className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-sm font-medium px-3 py-1.5 hover:bg-signal-300 transition-colors"
          >
            <RotateCcw size={14} /> Play again
          </button>
        </div>
      )}

      {/* Opponent */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-mist-500">Opponent · {state.opponentCount} cards</span>
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
              <UnoCard card={state.discardTop} disabled />
              <span
                className="w-3 h-3 rounded-full border border-white/30"
                style={{ background: COLOR_SWATCH[state.activeColor] || '#888' }}
                title={`Active color: ${state.activeColor}`}
              />
            </div>
          )}
        </div>

        <p className={`text-xs font-display tracking-widest ${state.myTurn ? 'text-cipher-500' : 'text-mist-600'}`}>
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

      {/* My hand */}
      <div>
        <p className="text-xs text-mist-500 mb-2">Your hand · {state.myHand.length} cards</p>
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
                  className="rounded-lg py-3 text-white text-sm font-semibold"
                >
                  {key}
                </button>
              ))}
            </div>
            <button onClick={() => setPendingWild(null)} className="mt-3 text-xs text-mist-500 hover:text-mist-100">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
