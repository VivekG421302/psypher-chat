import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ShieldOff, Users2 } from 'lucide-react';
import { useProfile } from '../context/ProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useChatRoom } from '../lib/useChatRoom.js';
import { useViewportHeight } from '../lib/useViewportHeight.js';
import { getRememberedRoom } from '../lib/storage.js';
import { api } from '../lib/api.js';
import { colorForName } from '../lib/crypto.js';
import RoomHeader from '../components/RoomHeader.jsx';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import GamesDrawer from '../components/GamesDrawer.jsx';
import DecryptText from '../components/DecryptText.jsx';

function StatusScreen({ icon: Icon, title, body, actionLabel, onAction }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
      <Icon size={30} className="text-signal-500" />
      <h1 className="font-display text-xl text-mist-100">{title}</h1>
      <p className="text-mist-500 max-w-sm text-sm">{body}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-2 rounded-lg bg-signal-500 text-ink-950 text-sm font-semibold px-4 py-2 hover:bg-signal-300 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function JoinGate({ roomId, onJoined }) {
  const { profile, setName } = useProfile();
  const { notify } = useToast();
  const [nameInput, setNameInput] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return notify('Enter a display name.', 'error');
    setLoading(true);
    try {
      setName(trimmed);
      const res = await api.joinRoom(roomId, { name: trimmed });
      onJoined({ userId: res.userId, name: trimmed, color: colorForName(trimmed) });
    } catch (err) {
      notify(err.message || 'Could not join this room.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-800/80 p-6 shadow-glow"
      >
        <h1 className="font-display text-sm tracking-widest text-mist-100 mb-1">
          <DecryptText text={`JOIN ${roomId}`} />
        </h1>
        <p className="text-xs text-mist-500 mb-5">Pick a display name to enter this room.</p>
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="e.g. Nyx"
          maxLength={32}
          className="w-full rounded-lg bg-ink-900 border border-ink-600 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500 outline-none transition-colors mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-signal-500 hover:bg-signal-300 disabled:opacity-60 text-ink-950 font-semibold text-sm py-2.5 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Enter room'}
        </button>
      </form>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [identity, setIdentity] = useState(null);
  const [gamesOpen, setGamesOpen] = useState(false);

  useEffect(() => {
    const remembered = getRememberedRoom(roomId);
    if (remembered?.userId) {
      setIdentity({
        userId: remembered.userId,
        name: remembered.name || profile?.name || 'Anonymous',
        color: profile?.color || colorForName(remembered.name || 'Anonymous'),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const chat = useChatRoom(roomId, identity);
  const viewportHeight = useViewportHeight();

  const memberCount = useMemo(() => chat.members.length, [chat.members]);

  if (!identity) {
    return <JoinGate roomId={roomId} onJoined={setIdentity} />;
  }

  if (chat.status === 'not_found') {
    return (
      <StatusScreen
        icon={ShieldOff}
        title="Room not found"
        body="This room has expired or never existed. Room codes only live for as long as the room stays active."
        actionLabel="Back to start"
        onAction={() => navigate('/')}
      />
    );
  }

  if (chat.status === 'full') {
    return (
      <StatusScreen
        icon={Users2}
        title="Room is full"
        body="This room already has two people in it. Ask for a different room code, or start your own."
        actionLabel="Back to start"
        onAction={() => navigate('/')}
      />
    );
  }

  if (chat.status === 'connecting') {
    return (
      <StatusScreen
        icon={Loader2}
        title="Connecting…"
        body="Deriving your encryption key from the room code."
      />
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      <RoomHeader
        roomId={roomId}
        members={chat.members}
        onLeave={chat.leaveRoom}
        onToggleGames={() => setGamesOpen((v) => !v)}
        gamesOpen={gamesOpen}
      />
      <MessageList messages={chat.messages} typingUser={chat.typingUser} viewportHeight={viewportHeight} />
      {!chat.connected && (
        <div className="px-4 py-2 bg-danger/10 border-t border-danger/30 text-danger text-xs text-center shrink-0">
          Reconnecting… messages sent now may not go through until this resolves.
        </div>
      )}
      <MessageInput onSend={chat.sendMessage} onTyping={chat.setTyping} disabled={!chat.connected} />
      <GamesDrawer
        open={gamesOpen}
        onClose={() => setGamesOpen(false)}
        roomId={roomId}
        identity={identity}
        memberCount={memberCount}
        chat={chat}
      />
    </div>
  );
}
