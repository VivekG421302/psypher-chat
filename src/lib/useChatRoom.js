import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socket.js';
import { encryptText, decryptText } from './crypto.js';
import { getRememberedRoom, rememberRoom, forgetRoom } from './storage.js';

export function useChatRoom(roomId, identity) {
  const [status, setStatus] = useState('connecting'); // connecting | joined | full | not_found | error
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeout = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId || !identity?.userId) return undefined;
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
      };
    }

    function onJoined(payload) {
      setStatus('joined');
      setMembers(payload.room.members);
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

    function onTyping(payload) {
      if (payload.userId === identity.userId) return;
      setTypingUser(payload.isTyping ? payload.name : null);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (payload.isTyping) {
        typingTimeout.current = setTimeout(() => setTypingUser(null), 4000);
      }
    }

    socket.on('room:joined', onJoined);
    socket.on('room:error', onError);
    socket.on('room:member_update', onMemberUpdate);
    socket.on('room:system', onSystem);
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);

    socket.emit('room:join', {
      roomId,
      userId: identity.userId,
      name: identity.name,
      color: identity.color,
    });

    rememberRoom(roomId, { userId: identity.userId, name: identity.name });

    return () => {
      socket.off('room:joined', onJoined);
      socket.off('room:error', onError);
      socket.off('room:member_update', onMemberUpdate);
      socket.off('room:system', onSystem);
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
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

  const setTyping = useCallback(
    (isTyping) => {
      socketRef.current?.emit('chat:typing', { roomId, isTyping });
    },
    [roomId]
  );

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    forgetRoom(roomId);
  }, [roomId]);

  return { status, members, messages, typingUser, sendMessage, setTyping, leaveRoom, socket: socketRef };
}

export { getRememberedRoom };
