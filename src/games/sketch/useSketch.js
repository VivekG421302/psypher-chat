import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../../lib/socket.js';

const GAME_ID = 'sketch';

// Both clients defensively ping time_up once their local clock crosses the
// deadline (see UnoGame-style pattern used elsewhere, extended here for a
// pure client-driven timer). The server is the source of truth and simply
// rejects the call as 'too_early' if the deadline hasn't actually passed —
// that's an expected race, not a real error, so we swallow it quietly
// instead of flashing a toast.
const SILENT_CODES = new Set(['too_early', 'wrong_phase', 'not_applicable']);

export function useSketch(roomId, ready) {
  const [state, setState] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ready) {
      setState(null);
      setWaiting(false);
    }
  }, [ready]);

  useEffect(() => {
    if (!roomId || !ready) return undefined;
    const socket = getSocket();

    function onState(payload) {
      if (payload.gameId !== GAME_ID) return;
      setWaiting(false);
      setState(payload.state);
    }
    function onWaiting(payload) {
      if (payload.gameId !== GAME_ID) return;
      setWaiting(true);
    }
    function onError(payload) {
      if (payload.gameId !== GAME_ID) return;
      if (SILENT_CODES.has(payload.code)) return;
      setError(payload.message);
      setTimeout(() => setError(null), 2500);
    }
    function onReset(payload) {
      if (payload.gameId !== GAME_ID) return;
      setState(null);
    }

    socket.on('game:state', onState);
    socket.on('game:waiting', onWaiting);
    socket.on('game:error', onError);
    socket.on('game:reset', onReset);
    socket.emit('game:join', { roomId, gameId: GAME_ID });

    return () => {
      socket.off('game:state', onState);
      socket.off('game:waiting', onWaiting);
      socket.off('game:error', onError);
      socket.off('game:reset', onReset);
    };
  }, [roomId, ready]);

  const act = useCallback(
    (action, payload = {}) => {
      getSocket().emit('game:action', { roomId, gameId: GAME_ID, action, payload });
    },
    [roomId]
  );

  return {
    state,
    waiting,
    error,
    chooseWord: (word) => act('choose_word', { word }),
    drawStroke: (points, color, size, newStroke) => act('draw_stroke', { points, color, size, newStroke }),
    clearCanvas: () => act('clear_canvas'),
    undoStroke: () => act('undo_stroke'),
    guess: (text) => act('guess', { text }),
    skipRound: () => act('skip_round'),
    timeUp: () => act('time_up'),
    nextRound: () => act('next_round'),
    restart: () => act('restart'),
  };
}
