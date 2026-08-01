import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../../lib/socket.js';

const GAME_ID = 'uno';

export function useUno(roomId, ready) {
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
    // 'ready' only flips true once the chat socket has confirmed room:join
    // server-side, so this is guaranteed not to race ahead of it — a plain
    // socket 'connect' listener here previously could fire before the room
    // rejoin completed, silently dropping the game join after a reconnect.
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
    playCard: (card, chosenColor) => act('play_card', { card, chosenColor }),
    drawCard: () => act('draw_card'),
    callUno: () => act('call_uno'),
    catchUno: () => act('catch_uno'),
    passTurn: () => act('pass_turn'),
    restart: () => act('restart'),
  };
}
