import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../../lib/socket.js';

const GAME_ID = 'glass-bridge';

export function useGlassBridge(roomId, ready) {
  const [state, setState]   = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!ready) { setState(null); setWaiting(false); }
  }, [ready]);

  useEffect(() => {
    if (!roomId || !ready) return;
    const socket = getSocket();

    const onState   = (p) => { if (p.gameId !== GAME_ID) return; setWaiting(false); setState(p.state); };
    const onWaiting = (p) => { if (p.gameId !== GAME_ID) return; setWaiting(true); };
    const onError   = (p) => { if (p.gameId !== GAME_ID) return; setError(p.message); setTimeout(() => setError(null), 3000); };
    const onReset   = (p) => { if (p.gameId !== GAME_ID) return; setState(null); };

    socket.on('game:state',   onState);
    socket.on('game:waiting', onWaiting);
    socket.on('game:error',   onError);
    socket.on('game:reset',   onReset);
    socket.emit('game:join', { roomId, gameId: GAME_ID });

    return () => {
      socket.off('game:state',   onState);
      socket.off('game:waiting', onWaiting);
      socket.off('game:error',   onError);
      socket.off('game:reset',   onReset);
    };
  }, [roomId, ready]);

  const act = useCallback(
    (action, payload = {}) => getSocket().emit('game:action', { roomId, gameId: GAME_ID, action, payload }),
    [roomId]
  );

  return {
    state,
    waiting,
    error,
    step:    (panel) => act('step', { panel }),
    restart: ()      => act('restart'),
  };
}
