import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldOff, Users2, KeyRound, RefreshCcw, MessageSquare, Gamepad2 } from 'lucide-react';
import { useProfile } from '../context/ProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useChatRoom } from '../lib/useChatRoom.js';
import { useViewportHeight } from '../lib/useViewportHeight.js';
import { useFaviconBadge } from '../lib/useFaviconBadge.js';
import { getRememberedRoom, rememberRoom } from '../lib/storage.js';
import { api } from '../lib/api.js';
import { colorForName } from '../lib/crypto.js';
import RoomHeader from '../components/RoomHeader.jsx';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import SelectionBar from '../components/SelectionBar.jsx';
import GamesDrawer from '../components/GamesDrawer.jsx';
import DecryptText from '../components/DecryptText.jsx';
import Spinner from '../components/Spinner.jsx';

function StatusScreen({ icon: Icon, title, body, actionLabel, onAction, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-14 h-14 rounded-2xl bg-signal-700/10 border border-signal-700/30 flex items-center justify-center"
      >
        <Icon size={26} className="text-signal-500" />
      </motion.div>
      <h1 className="font-display text-xl text-mist-100">{title}</h1>
      <p className="text-mist-500 max-w-sm text-sm">{body}</p>
      {children}
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-1 rounded-lg bg-signal-500 text-ink-950 text-sm font-semibold px-4 py-2 hover:bg-signal-300 transition-colors cursor-pointer"
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
  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [reviving, setReviving] = useState(false);
  const [expired, setExpired] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return notify('Enter a display name.', 'error');
    setLoading(true);
    setExpired(false);
    try {
      setName(trimmed);
      const res = await api.joinRoom(roomId, { name: trimmed });
      rememberRoom(roomId, { userId: res.userId, name: trimmed, label: roomId });
      onJoined({ userId: res.userId, name: trimmed, color: colorForName(trimmed) });
    } catch (err) {
      if (err.code === 'not_found') {
        setExpired(true);
        notify('This room code has expired.', 'error');
      } else {
        notify(err.message || 'Could not join this room.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function recreate() {
    const trimmed = nameInput.trim();
    if (!trimmed) return notify('Enter a display name first.', 'error');
    setReviving(true);
    try {
      setName(trimmed);
      const res = await api.createRoom(trimmed, null, roomId);
      rememberRoom(res.roomId, { userId: res.userId, name: trimmed, label: `My room · ${res.roomId}` });
      notify('Room revived with the same code — share it with your friend again.', 'success');
      onJoined({ userId: res.userId, name: trimmed, color: colorForName(trimmed) });
    } catch (err) {
      if (err.code === 'exists') {
        notify('Someone just revived this room — joining it instead…', 'info');
        setExpired(false);
        try {
          const res = await api.joinRoom(roomId, { name: trimmed });
          rememberRoom(roomId, { userId: res.userId, name: trimmed, label: roomId });
          onJoined({ userId: res.userId, name: trimmed, color: colorForName(trimmed) });
        } catch (err2) {
          notify(err2.message || 'Could not join this room.', 'error');
        }
      } else {
        notify(err.message || 'Could not revive this room.', 'error');
      }
    } finally {
      setReviving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
          disabled={loading || reviving}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-signal-500 hover:bg-signal-300 disabled:opacity-60 text-ink-950 font-semibold text-sm py-2.5 transition-colors cursor-pointer"
        >
          {loading ? <Spinner size={16} light /> : 'Enter room'}
        </button>

        <AnimatePresence>
          {expired && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-xl border border-cipher-700/40 bg-cipher-700/10 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-cipher-500 mb-1">
                  <KeyRound size={13} /> This code isn't active anymore
                </p>
                <p className="text-[11px] text-mist-500 leading-relaxed mb-3">
                  Rooms vanish after 15 minutes of silence. You can start a brand
                  new room using this exact code — anyone with the same code
                  saved will land right back here.
                </p>
                <button
                  type="button"
                  onClick={recreate}
                  disabled={reviving}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-cipher-500/50 text-cipher-500 text-xs font-medium py-2 hover:bg-cipher-700/15 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {reviving ? <Spinner size={14} /> : <RefreshCcw size={13} />}
                  Recreate room {roomId}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full text-center text-[11px] text-mist-600 hover:text-mist-300 mt-4 transition-colors cursor-pointer"
        >
          Back to start
        </button>
      </motion.form>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { notify } = useToast();
  const [identity, setIdentity] = useState(null);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [editingMessage, setEditingMessage] = useState(null);
  // Mobile toggle between chat and game panel (when both are open)
  const [mobileView, setMobileView] = useState('chat'); // 'chat' | 'game'
  // Tracked at Room level (not inside GamesDrawer) so the notification works
  // even when the games panel is closed / not mounted at all.
  const [opponentGame, setOpponentGame] = useState(null); // { gameId } | null
  const [opponentGameUnseen, setOpponentGameUnseen] = useState(false);
  const notifiedGameRef = useRef(null);
  const setFaviconUnread = useFaviconBadge();
  const lastMessageIdRef = useRef(null);

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

  // When games close, reset mobile view to chat
  useEffect(() => {
    if (!gamesOpen) setMobileView('chat');
  }, [gamesOpen]);

  const chat = useChatRoom(roomId, identity);
  const viewportHeight = useViewportHeight();

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  // /          → focus chat input
  // G          → open games panel (when closed) or close it (when open)
  // Escape     → close games panel (if open and no game active)
  // ─ (inside games panel via a shared ref)
  // ArrowUp / ArrowDown → navigate game list when games panel is open
  const [gameListFocus, setGameListFocus] = useState(-1); // index in games list
  useEffect(() => {
    function onKey(e) {
      // Ignore when typing in any input / contenteditable
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' ||
        document.activeElement?.isContentEditable;

      if (e.key === '/' && !inInput) {
        e.preventDefault();
        const editor = document.querySelector('[data-chat-input]');
        editor?.focus();
        return;
      }

      if ((e.key === 'g' || e.key === 'G') && !inInput) {
        e.preventDefault();
        setGamesOpen((v) => !v);
        setGameListFocus(0);
        return;
      }

      if (e.key === 'Escape' && gamesOpen) {
        setGamesOpen(false);
        setGameListFocus(-1);
        return;
      }

      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && gamesOpen) {
        e.preventDefault();
        setGameListFocus((prev) => {
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          return Math.max(0, prev + dir);
        });
        return;
      }

      if (e.key === 'Enter' && gamesOpen && gameListFocus >= 0 && !inInput) {
        e.preventDefault();
        // Dispatch a custom event that GamesDrawer listens to
        window.dispatchEvent(new CustomEvent('psypher:game-select', { detail: { index: gameListFocus } }));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gamesOpen, gameListFocus]);

  // ── Green-dot game invite: works regardless of whether the games panel
  // is open, since (unlike before) this listener lives at Room level and
  // is always mounted for the lifetime of the room. ──
  useEffect(() => {
    const socket = chat.socket?.current;
    if (!socket || !identity) return undefined;

    function onGameStarted({ gameId, startedBy }) {
      if (startedBy === identity.userId) return; // it was us
      setOpponentGame({ gameId });
      setOpponentGameUnseen(true);
      if (notifiedGameRef.current !== gameId) {
        notifiedGameRef.current = gameId;
        const starter = chat.members.find((m) => m.userId === startedBy);
        chat.notifyLocal(`${starter?.name || 'Your partner'} started a game — open Minigames to join!`);
      }
    }
    function onGameEnded() {
      setOpponentGame(null);
      notifiedGameRef.current = null;
    }

    socket.on('game:started', onGameStarted);
    socket.on('game:ended', onGameEnded);
    return () => {
      socket.off('game:started', onGameStarted);
      socket.off('game:ended', onGameEnded);
    };
  }, [chat.socket, chat.members, chat.notifyLocal, identity]);

  // Opening the games panel counts as having "seen" the invite.
  useEffect(() => {
    if (gamesOpen) setOpponentGameUnseen(false);
  }, [gamesOpen]);

  // ── Favicon unread dot: badge the tab icon when a new message from the
  // other person arrives while this tab is hidden or unfocused. ──
  useEffect(() => {
    if (!chat.messages.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (lastMessageIdRef.current === last.id) return;
    lastMessageIdRef.current = last.id;
    const isIncoming = last.kind === 'message' && !last.mine;
    const tabHidden = document.visibilityState !== 'visible' || !document.hasFocus();
    if (isIncoming && tabHidden) setFaviconUnread(true);
  }, [chat.messages, setFaviconUnread]);

  const memberCount = useMemo(() => chat.members.length, [chat.members]);
  const selectMode = selectedIds.size > 0;

  const selectableMessages = useMemo(
    () => chat.messages.filter((m) => m.kind === 'message'),
    [chat.messages]
  );

  const enterSelectMode = useCallback((id) => {
    setEditingMessage(null);
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(() => {
    const allIds = selectableMessages.map((m) => m.id);
    setSelectedIds((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  }, [selectableMessages]);

  const copyText = useCallback(
    (text) => {
      navigator.clipboard?.writeText(text);
      notify('Copied to clipboard.', 'success', 1500);
    },
    [notify]
  );

  const selectedMessages = useMemo(
    () => chat.messages.filter((m) => m.kind === 'message' && selectedIds.has(m.id)),
    [chat.messages, selectedIds]
  );
  const allSelectedAreMine = selectedMessages.length > 0 && selectedMessages.every((m) => m.mine);

  function copySelected() {
    const text = selectedMessages.map((m) => `${m.senderName}: ${m.text}`).join('\n');
    copyText(text);
    cancelSelection();
  }

  function deleteSelected() {
    selectedMessages.forEach((m) => chat.deleteMessage(m.id));
    cancelSelection();
  }

  function startEdit(message) {
    setSelectedIds(new Set());
    setEditingMessage(message);
  }

  function submitEdit(id, text) {
    chat.editMessage(id, text);
    setEditingMessage(null);
  }

  if (!identity) {
    return <JoinGate roomId={roomId} onJoined={setIdentity} />;
  }

  if (chat.status === 'not_found') {
    return (
      <StatusScreen
        icon={ShieldOff}
        title="Room not found"
        body="This room has expired or never existed. Room codes only live for as long as the room stays active."
      >
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
          <button
            onClick={async () => {
              try {
                const res = await api.createRoom(identity.name, null, roomId);
                rememberRoom(res.roomId, { userId: res.userId, name: identity.name, label: `My room · ${res.roomId}` });
                notify('Room revived with the same code.', 'success');
                setIdentity({ userId: res.userId, name: identity.name, color: identity.color });
              } catch (err) {
                notify(err.message || 'Could not revive this room.', 'error');
              }
            }}
            className="rounded-lg border border-cipher-500/50 text-cipher-500 text-sm font-medium px-4 py-2 hover:bg-cipher-700/15 transition-colors cursor-pointer"
          >
            Recreate room {roomId}
          </button>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-signal-500 text-ink-950 text-sm font-semibold px-4 py-2 hover:bg-signal-300 transition-colors cursor-pointer"
          >
            Back to start
          </button>
        </div>
      </StatusScreen>
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Spinner size={28} />
        <p className="font-display text-xs tracking-widest text-mist-500">CONNECTING…</p>
        <p className="text-mist-600 text-xs">Deriving your encryption key from the room code.</p>
      </div>
    );
  }

  // ── Chat panel ──
  const ChatPanel = (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
      <MessageList
        messages={chat.messages}
        typingUser={chat.typingUser}
        viewportHeight={viewportHeight}
        myUserId={identity.userId}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onEnterSelectMode={enterSelectMode}
        onEdit={startEdit}
        onDelete={(id) => chat.deleteMessage(id)}
        onReact={(id, emoji) => chat.reactToMessage(id, emoji)}
        onCopy={copyText}
      />
      {!chat.connected && (
        <div className="px-4 py-2 bg-danger/10 border-t border-danger/30 text-danger text-xs text-center shrink-0">
          Reconnecting… messages sent now may not go through until this resolves.
        </div>
      )}
      {selectMode ? (
        <SelectionBar
          count={selectedIds.size}
          totalSelectable={selectableMessages.length}
          allSelectedAreMine={allSelectedAreMine}
          onCancel={cancelSelection}
          onCopy={copySelected}
          onDelete={deleteSelected}
          onSelectAll={selectAll}
        />
      ) : (
        <MessageInput
          onSend={chat.sendMessage}
          onTyping={chat.setTyping}
          disabled={!chat.connected}
          editingMessage={editingMessage}
          onSubmitEdit={submitEdit}
          onCancelEdit={() => setEditingMessage(null)}
        />
      )}
    </div>
  );

  return (
    <div
      className="flex flex-col overflow-hidden fixed inset-0 z-10"
      style={{ height: viewportHeight ? `${viewportHeight}px` : undefined }}
    >
      <RoomHeader
        roomId={roomId}
        members={chat.members}
        onLeave={chat.leaveRoom}
        onToggleGames={() => setGamesOpen((v) => !v)}
        gamesOpen={gamesOpen}
        mobileView={mobileView}
        setMobileView={setMobileView}
        gamesPanelOpen={gamesOpen}
        opponentGameUnseen={opponentGameUnseen}
      />

      {/*
        Layout strategy:
        - Desktop (lg+): always side-by-side — chat takes remaining space,
          game panel is a fixed 420px column. Both visible simultaneously.
        - Mobile: only one panel visible at a time, controlled by mobileView.
          The outer div is `relative overflow-hidden`; both panels are
          absolute-positioned side by side (200% wide total), and we
          translate left/right to reveal the active one.
      */}

      {/* Desktop side-by-side wrapper */}
      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {ChatPanel}
        </div>
        {gamesOpen && (
          <div className="flex flex-col w-[420px] shrink-0 min-h-0 overflow-hidden border-l border-ink-700">
            <GamesDrawer
              open={gamesOpen}
              onClose={() => setGamesOpen(false)}
              roomId={roomId}
              identity={identity}
              memberCount={memberCount}
              chat={chat}
              opponentActiveGame={opponentGame?.gameId || null}
              gameListFocus={gameListFocus}
              inline
            />
          </div>
        )}
      </div>

      {/* Mobile slide wrapper */}
      <div className="lg:hidden flex flex-1 min-h-0 overflow-hidden relative">
        {/* Chat — always mounted, translated left when game is active */}
        <div
          className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out"
          style={{ transform: gamesOpen && mobileView === 'game' ? 'translateX(-100%)' : 'translateX(0)' }}
        >
          {ChatPanel}
        </div>
        {/* Game — always mounted when open, starts offscreen right */}
        {gamesOpen && (
          <div
            className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out"
            style={{ transform: mobileView === 'game' ? 'translateX(0)' : 'translateX(100%)' }}
          >
            <GamesDrawer
              open={gamesOpen}
              onClose={() => setGamesOpen(false)}
              roomId={roomId}
              identity={identity}
              memberCount={memberCount}
              chat={chat}
              opponentActiveGame={opponentGame?.gameId || null}
              gameListFocus={gameListFocus}
              inline
            />
          </div>
        )}
      </div>
    </div>
  );
}
