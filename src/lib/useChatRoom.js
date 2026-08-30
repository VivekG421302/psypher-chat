import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socket.js';
import { encryptText, decryptText } from './crypto.js';
import { getRememberedRoom, rememberRoom } from './storage.js';

export function useChatRoom(roomId, identity) {
  const [status, setStatus] = useState('connecting'); // connecting | joined | full | not_found
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [gameReactions, setGameReactions] = useState([]);
  const typingTimeout = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId || !identity?.userId) return undefined;
    // Create a fresh socket for this room session. Each mount gets its own
    // connection so two players in the same browser never share a socket.
    const socket = getSocket();
    socketRef.current = socket;

    async function decryptIncoming(msg) {
      const text = await decryptText(msg.ciphertext, roomId);
      return {
        id: msg.id,
        kind: 'message',
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderColor: msg.senderColor,
        ts: msg.ts,
        mine: msg.senderId === identity.userId,
        text: text ?? '⚠️ Could not decrypt this message.',
        failed: text === null,
        edited: !!msg.edited,
        editedAt: msg.editedAt || null,
        reactions: msg.reactions || {},
      };
    }

    function join() {
      socket.emit('room:join', {
        roomId,
        userId: identity.userId,
        name: identity.name,
        color: identity.color,
      });
    }

    function onJoined(payload) {
      setStatus('joined');
      setConnected(true);
      setMembers(payload.room.members);
      // Full history replay on every (re)join, including reconnects — this
      // also self-heals any messages that arrived while we were briefly
      // disconnected (e.g. a mobile network blip or a Render cold start).
      Promise.all(payload.messages.map(decryptIncoming)).then(setMessages);
    }

    function onError(payload) {
      setStatus(payload.code === 'full' ? 'full' : 'not_found');
    }

    function onMemberUpdate(payload) {
      setMembers(payload.members);
    }

    function onSystem(payload) {
      setMessages((prev) => [...prev, { id: payload.id, kind: 'system', text: payload.text, ts: payload.ts }]);
    }

    async function onMessage(msg) {
      const decrypted = await decryptIncoming(msg);
      setMessages((prev) => [...prev, decrypted]);
    }

    async function onEdited(payload) {
      const text = await decryptText(payload.ciphertext, roomId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId && m.kind === 'message'
            ? { ...m, text: text ?? m.text, failed: text === null, edited: true, editedAt: payload.editedAt }
            : m
        )
      );
    }

    function onDeleted(payload) {
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { id: m.id, kind: 'deleted', ts: m.ts, mine: m.mine } : m))
      );
    }

    function onReaction(payload) {
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
      );
    }

    function onGameReaction(payload) {
      setGameReactions((prev) => [...prev.slice(-8), payload]);
    }

    function onTyping(payload) {
      if (payload.userId === identity.userId) return;
      setTypingUser(payload.isTyping ? payload.name : null);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (payload.isTyping) {
        typingTimeout.current = setTimeout(() => setTypingUser(null), 4000);
      }
    }

    function onDisconnect() {
      setConnected(false);
    }

    socket.on('room:joined', onJoined);
    socket.on('room:error', onError);
    socket.on('room:member_update', onMemberUpdate);
    socket.on('room:system', onSystem);
    socket.on('chat:message', onMessage);
    socket.on('chat:message_edited', onEdited);
    socket.on('chat:message_deleted', onDeleted);
    socket.on('chat:reaction', onReaction);
    socket.on('room:reaction', onGameReaction);
    socket.on('chat:typing', onTyping);
    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);

    // If the socket is already connected (e.g. we navigated here without a
    // full page reload and reused the shared connection), 'connect' won't
    // fire again on its own — join immediately in that case.
    if (socket.connected) join();

    rememberRoom(roomId, { userId: identity.userId, name: identity.name });

    return () => {
      socket.off('room:joined', onJoined);
      socket.off('room:error', onError);
      socket.off('room:member_update', onMemberUpdate);
      socket.off('room:system', onSystem);
      socket.off('chat:message', onMessage);
      socket.off('chat:message_edited', onEdited);
      socket.off('chat:message_deleted', onDeleted);
      socket.off('chat:reaction', onReaction);
      socket.off('room:reaction', onGameReaction);
      socket.off('chat:typing', onTyping);
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      // Disconnect and destroy this socket — the next mount will create a new one
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, identity?.userId, identity?.name, identity?.color]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || !socketRef.current) return;
      const ciphertext = await encryptText(text, roomId);
      socketRef.current.emit('chat:message', { roomId, ciphertext });
    },
    [roomId]
  );

  const editMessage = useCallback(
    async (messageId, text) => {
      if (!text.trim() || !socketRef.current) return;
      const ciphertext = await encryptText(text, roomId);
      socketRef.current.emit('chat:edit', { roomId, messageId, ciphertext });
    },
    [roomId]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      socketRef.current?.emit('chat:delete', { roomId, messageId });
    },
    [roomId]
  );

  const reactToMessage = useCallback(
    (messageId, emoji) => {
      socketRef.current?.emit('chat:react', { roomId, messageId, emoji });
    },
    [roomId]
  );

  const sendGameReaction = useCallback(
    (emoji) => {
      socketRef.current?.emit('room:react', { roomId, emoji });
    },
    [roomId]
  );

  const setTyping = useCallback(
    (isTyping) => {
      socketRef.current?.emit('chat:typing', { roomId, isTyping });
    },
    [roomId]
  );

  const leaveRoom = useCallback(() => {
    // Only disconnect — never delete the room from storage.
    // Rooms persist forever; the user can rejoin from the directory.
    socketRef.current?.emit('room:leave');
  }, [roomId]);

  // Push a client-only "system" line into the message list — never sent to
  // the server or the other member (they get their own local notice from
  // their own socket events). Used for things like game-start invitations
  // that should show up even if the games panel is closed.
  const notifyLocal = useCallback((text, extraFields = {}) => {
    setMessages((prev) => [...prev, {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: 'system',
      text,
      ts: Date.now(),
      ...extraFields,
    }]);
  }, []);

  return {
    status,
    connected,
    members,
    messages,
    typingUser,
    gameReactions,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    sendGameReaction,
    setTyping,
    leaveRoom,
    notifyLocal,
    socket: socketRef,
  };
}

export { getRememberedRoom };
