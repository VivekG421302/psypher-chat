import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socket.js';
import { encryptText, decryptText } from './crypto.js';
import { getRememberedRoom, rememberRoom } from './storage.js';

export function useChatRoom(roomId, identity) {
  const [status, setStatus]         = useState('connecting');
  const [connected, setConnected]   = useState(false);
  const [members, setMembers]       = useState([]);
  const [messages, setMessages]     = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [gameReactions, setGameReactions] = useState([]);
  const [opponentSeenUpTo, setOpponentSeenUpTo] = useState(0);
  const typingTimeout = useRef(null);
  const socketRef     = useRef(null);

  useEffect(() => {
    if (!roomId || !identity?.userId) return undefined;

    const socket = getSocket();
    socketRef.current = socket;

    async function decryptIncoming(msg) {
      const text = await decryptText(msg.ciphertext, roomId);
      return {
        id: msg.id, kind: 'message',
        senderId: msg.senderId, senderName: msg.senderName, senderColor: msg.senderColor,
        ts: msg.ts, mine: msg.senderId === identity.userId,
        text: text ?? '⚠️ Could not decrypt this message.',
        failed: text === null, edited: !!msg.edited, editedAt: msg.editedAt || null,
        reactions: msg.reactions || {},
        replyTo: msg.replyTo || null,
      };
    }

    function join() {
      socket.emit('room:join', {
        roomId, userId: identity.userId, name: identity.name, color: identity.color,
      });
    }

    function onJoined(payload) {
      setStatus('joined');
      setConnected(true);
      setMembers(payload.room.members);
      // Full history replay on (re)join, including reconnects
      Promise.all(payload.messages.map(decryptIncoming)).then(msgs => {
        setMessages(msgs);
        // Mark all existing messages as seen
        const latestTs = msgs.reduce((max, m) => Math.max(max, m.ts || 0), 0);
        if (latestTs) socket.emit('chat:seen', { roomId, upToTs: latestTs });
      });
      // Save to storage on every successful join
      rememberRoom(roomId, { userId: identity.userId, name: identity.name });
    }

    function onError(payload) {
      setStatus(payload.code === 'full' ? 'full' : 'not_found');
    }

    function onMemberUpdate(payload) { setMembers(payload.members); }
    function onSystem(payload) {
      setMessages(prev => [...prev, { id: payload.id, kind: 'system', text: payload.text, ts: payload.ts }]);
    }
    async function onMessage(msg) {
      decryptIncoming(msg).then(d => setMessages(prev => [...prev, d]));
    }
    async function onEdited(payload) {
      const text = await decryptText(payload.ciphertext, roomId);
      setMessages(prev => prev.map(m =>
        m.id === payload.messageId && m.kind === 'message'
          ? { ...m, text: text ?? m.text, failed: text === null, edited: true, editedAt: payload.editedAt }
          : m
      ));
    }
    function onDeleted(payload) {
      setMessages(prev => prev.map(m =>
        m.id === payload.messageId ? { id: m.id, kind: 'deleted', ts: m.ts, mine: m.mine } : m
      ));
    }
    function onReaction(payload) {
      setMessages(prev => prev.map(m =>
        m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m
      ));
    }
    function onGameReaction(payload) {
      setGameReactions(prev => [...prev.slice(-8), payload]);
    }
    function onSeen({ byUserId, upToTs }) {
      if (byUserId !== identity.userId) {
        setOpponentSeenUpTo(prev => Math.max(prev, upToTs));
      }
    }
    function onTyping(payload) {
      if (payload.userId === identity.userId) return;
      setTypingUser(payload.isTyping ? payload.name : null);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (payload.isTyping) typingTimeout.current = setTimeout(() => setTypingUser(null), 4000);
    }
    function onConnect() {
      // Re-join room on every reconnect — this also re-syncs member list
      join();
    }
    function onDisconnect() { setConnected(false); }

    socket.on('room:joined',        onJoined);
    socket.on('room:error',         onError);
    socket.on('room:member_update', onMemberUpdate);
    socket.on('room:system',        onSystem);
    socket.on('chat:message',       onMessage);
    socket.on('chat:message_edited',onEdited);
    socket.on('chat:message_deleted',onDeleted);
    socket.on('chat:reaction',      onReaction);
    socket.on('room:reaction',      onGameReaction);
    socket.on('chat:seen',          onSeen);
    socket.on('chat:typing',        onTyping);
    socket.on('connect',            onConnect);
    socket.on('disconnect',         onDisconnect);

    if (socket.connected) join();

    return () => {
      socket.off('room:joined',        onJoined);
      socket.off('room:error',         onError);
      socket.off('room:member_update', onMemberUpdate);
      socket.off('room:system',        onSystem);
      socket.off('chat:message',       onMessage);
      socket.off('chat:message_edited',onEdited);
      socket.off('chat:message_deleted',onDeleted);
      socket.off('chat:reaction',      onReaction);
      socket.off('room:reaction',      onGameReaction);
      socket.off('chat:seen',          onSeen);
      socket.off('chat:typing',        onTyping);
      socket.off('connect',            onConnect);
      socket.off('disconnect',         onDisconnect);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, identity?.userId, identity?.name, identity?.color]);

  const sendMessage = useCallback(async (text, replyTo = null) => {
    if (!text.trim() || !socketRef.current) return;
    const ciphertext = await encryptText(text, roomId);
    socketRef.current.emit('chat:message', { roomId, ciphertext, replyTo });
  }, [roomId]);

  const editMessage = useCallback(async (messageId, text) => {
    if (!text.trim() || !socketRef.current) return;
    const ciphertext = await encryptText(text, roomId);
    socketRef.current.emit('chat:edit', { roomId, messageId, ciphertext });
  }, [roomId]);

  const deleteMessage   = useCallback((messageId) => socketRef.current?.emit('chat:delete',  { roomId, messageId }), [roomId]);
  const reactToMessage  = useCallback((messageId, emoji) => socketRef.current?.emit('chat:react', { roomId, messageId, emoji }), [roomId]);
  const sendGameReaction= useCallback((emoji) => socketRef.current?.emit('room:react', { roomId, emoji }), [roomId]);
  const setTyping       = useCallback((isTyping) => socketRef.current?.emit('chat:typing', { roomId, isTyping }), [roomId]);
  const leaveRoom       = useCallback(() => socketRef.current?.emit('room:leave'), []);
  const markSeen        = useCallback((ts) => socketRef.current?.emit('chat:seen', { roomId, upToTs: ts }), [roomId]);

  const notifyLocal = useCallback((text, extraFields = {}) => {
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: 'system', text, ts: Date.now(), ...extraFields,
    }]);
  }, []);

  // Update an existing local message (e.g. update game-invite card with winner)
  const updateLocal = useCallback((predicate, patch) => {
    setMessages(prev => prev.map(m => predicate(m) ? { ...m, ...patch } : m));
  }, []);

  return {
    status, connected, members, messages, typingUser, gameReactions,
    opponentSeenUpTo,
    sendMessage, editMessage, deleteMessage, reactToMessage, sendGameReaction,
    setTyping, leaveRoom, notifyLocal, updateLocal, markSeen,
    socket: socketRef,
  };
}

export { getRememberedRoom };
