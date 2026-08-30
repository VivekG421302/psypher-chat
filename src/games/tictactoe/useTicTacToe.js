import { useEffect, useState, useCallback } from 'react';

const GAME_ID = 'tictactoe';

export function useTicTacToe(roomId, ready, socketRef) {
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
    const socket = socketRef?.current;
    if (!socket) return undefined;

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
    // 'ready' only flips once room:join is server-confirmed, so this can't
    // race ahead of the room rejoin (mirrors useUno / useGuessWho).
    socket.emit('game:join', { roomId, gameId: GAME_ID });

    return () => {
      socket.off('game:state', onState);
      socket.off('game:waiting', onWaiting);
      socket.off('game:error', onError);
      socket.off('game:reset', onReset);
    };
  }, [roomId, ready, socketRef]);

  const act = useCallback(
    (action, payload = {}) => {
      socketRef?.current?.emit('game:action', { roomId, gameId: GAME_ID, action, payload });
    },
    [roomId, socketRef]
  );

  return {
    state,
    waiting,
    error,
    makeMove: (index) => act('make_move', { index }),
    restart: () => act('restart'),
  };
}
