import { useEffect, useState, useCallback } from 'react';

const GAME_ID = 'chess';

export function useChess(roomId, ready, socketRef) {
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
    function onError(p)   { if (p.gameId !== GAME_ID) return; setError(p.message); setTimeout(() => setError(null), 2500); }
    function onReset(p)   { if (p.gameId !== GAME_ID) return; setState(null); }

    socket.on('game:state',   onState);
    socket.on('game:waiting', onWaiting);
    socket.on('game:error',   onError);
    socket.on('game:reset',   onReset);
    socket.on('connect',      join);

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
    movePiece:   (from, to, promotion) => act('move', { from, to, promotion }),
    resign:      () => act('resign'),
    offerDraw:   () => act('offer_draw'),
    acceptDraw:  () => act('accept_draw'),
    restart:     () => act('restart'),
  };
}
