import { useEffect, useState, useCallback, useRef } from 'react';

const GAME_ID = 'sketch';
const SILENT = new Set(['too_early', 'wrong_phase', 'not_applicable']);

export function useSketch(roomId, ready, socketRef) {
  const [state, setState]     = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!ready) { setState(null); setWaiting(false); }
  }, [ready]);

  useEffect(() => {
    if (!roomId || !ready) return;
    const socket = socketRef?.current;
    if (!socket) return;

    function join() { socket.emit('game:join', { roomId, gameId: GAME_ID }); }
    function onState(p)   { if (p.gameId !== GAME_ID) return; setWaiting(false); setState(p.state); }
    function onWaiting(p) { if (p.gameId !== GAME_ID) return; setWaiting(true); }
    function onError(p)   { if (p.gameId !== GAME_ID) return; if (SILENT.has(p.code)) return; setError(p.message); setTimeout(() => setError(null), 2500); }
    function onReset(p)   { if (p.gameId !== GAME_ID) return; setState(null); }

    socket.on('game:state',   onState);
    socket.on('game:waiting', onWaiting);
    socket.on('game:error',   onError);
    socket.on('game:reset',   onReset);
    socket.on('connect',      join);   // re-join on reconnect

    if (socket.connected) join();

    return () => {
      socket.off('game:state',   onState);
      socket.off('game:waiting', onWaiting);
      socket.off('game:error',   onError);
      socket.off('game:reset',   onReset);
      socket.off('connect',      join);
    };
  }, [roomId, ready, socketRef]);

  const act = useCallback(
    (action, payload = {}) => socketRef?.current?.emit('game:action', { roomId, gameId: GAME_ID, action, payload }),
    [roomId, socketRef]
  );

  return {
    state, waiting, error,
    chooseWord:     (word) => act('choose_word', { word }),
    drawStroke:     (points, color, size, newStroke) => act('draw_stroke', { points, color, size, newStroke }),
    clearCanvas:    () => act('clear_canvas'),
    undoStroke:     () => act('undo_stroke'),
    fillBackground: (color) => act('fill_background', { color }),
    guess:          (text) => act('guess', { text }),
    skipRound:      () => act('skip_round'),
    timeUp:         () => act('time_up'),
    nextRound:      () => act('next_round'),
    restart:        () => act('restart'),
  };
}
