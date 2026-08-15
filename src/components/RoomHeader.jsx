import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, LogOut, Gamepad2, ShieldCheck, Users, Pin, PinOff, MessageSquare, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext.jsx';
import { loadRooms, rememberRoom } from '../lib/storage.js';

export default function RoomHeader({
  roomId,
  members,
  onLeave,
  onToggleGames,
  gamesOpen,
  mobileView,
  setMobileView,
  opponentGameUnseen = false,
}) {
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [roomLabel, setRoomLabel] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const labelInputRef = useRef(null);
  const navigate = useNavigate();
  const { notify } = useToast();

  // Load saved pin/label state from storage
  useEffect(() => {
    const rooms = loadRooms();
    const saved = rooms[roomId];
    if (saved) {
      setPinned(!!saved.pinned);
      setRoomLabel(saved.label || '');
    }
  }, [roomId]);

  // Auto-fill the label input with the other person's name
  useEffect(() => {
    const otherMember = members.find((m) => !m.mine);
    if (nameModalOpen) {
      setLabelInput(roomLabel || otherMember?.name || '');
      // Focus AND select the pre-filled text so typing immediately replaces
      // it — matches the "auto-filled with the other person's name, and
      // that name is selected by default" requirement.
      setTimeout(() => labelInputRef.current?.select(), 60);
    }
  }, [nameModalOpen, members, roomLabel]);

  function copyCode() {
    navigator.clipboard?.writeText(roomId);
    setCopied(true);
    notify('Room code copied to clipboard.', 'success', 1800);
    setTimeout(() => setCopied(false), 1600);
  }

  function handleLeave() {
    onLeave();
    navigate('/');
  }

  function togglePin() {
    const rooms = loadRooms();
    const next = !pinned;
    setPinned(next);
    rememberRoom(roomId, { ...rooms[roomId], pinned: next });
    notify(next ? "Room pinned \u2014 it won't be cleared automatically." : 'Room unpinned.', 'success', 1800);
  }

  function saveLabel() {
    const trimmed = labelInput.trim();
    setRoomLabel(trimmed);
    const rooms = loadRooms();
    rememberRoom(roomId, { ...rooms[roomId], label: trimmed || roomId });
    setNameModalOpen(false);
    notify('Room name saved.', 'success', 1500);
  }

  const connectedCount = members.filter((m) => m.connected).length;
  const bothOnline = connectedCount >= 2;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-900/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck size={18} className="text-signal-500 shrink-0" />

          {/* Room code / label */}
          <button
            onClick={copyCode}
            className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 hover:border-signal-500/60 transition-colors group cursor-pointer max-w-[140px] sm:max-w-none"
            title="Copy room code"
          >
            {pinned && <Pin size={12} className="text-cipher-500 shrink-0" />}
            <span className="font-display text-xs sm:text-sm tracking-widest text-mist-100 truncate">
              {roomLabel && roomLabel !== roomId ? roomLabel : roomId}
            </span>
            {copied ? (
              <Check size={14} className="text-cipher-500 animate-pop-in shrink-0" />
            ) : (
              <Copy size={14} className="text-mist-500 group-hover:text-signal-500 shrink-0" />
            )}
          </button>

          {/* Online indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-mist-500">
            <span className="relative flex items-center justify-center w-3.5 h-3.5">
              {bothOnline && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-cipher-500 opacity-40 animate-ping" />
              )}
              <span className={`relative inline-flex rounded-full w-2 h-2 ${bothOnline ? 'bg-cipher-500' : connectedCount === 1 ? 'bg-signal-500' : 'bg-mist-700'}`} />
            </span>
            <Users size={13} />
            <span>{connectedCount}/2 online</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mobile toggle: chat / game (only when games are open) */}
          {gamesOpen && (
            <div className="flex lg:hidden items-center gap-0.5 rounded-lg border border-ink-700 bg-ink-800 p-0.5">
              <button
                onClick={() => setMobileView('chat')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  mobileView === 'chat'
                    ? 'bg-signal-500 text-ink-950'
                    : 'text-mist-400 hover:text-mist-100'
                }`}
              >
                <MessageSquare size={13} />
                <span className="hidden xs:inline">Chat</span>
              </button>
              <button
                onClick={() => setMobileView('game')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  mobileView === 'game'
                    ? 'bg-cipher-500 text-ink-950'
                    : 'text-mist-400 hover:text-mist-100'
                }`}
              >
                <Gamepad2 size={13} />
                <span className="hidden xs:inline">Game</span>
              </button>
            </div>
          )}

          {/* Rename room */}
          <button
            onClick={() => setNameModalOpen(true)}
            className="p-1.5 rounded-lg border border-ink-600 text-mist-400 hover:text-mist-100 hover:border-signal-500/40 transition-colors cursor-pointer"
            title="Name this room"
            aria-label="Name this room"
          >
            <Edit3 size={15} />
          </button>

          {/* Pin room */}
          <button
            onClick={togglePin}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              pinned
                ? 'border-cipher-500/50 text-cipher-500 bg-cipher-700/10'
                : 'border-ink-600 text-mist-400 hover:text-mist-100 hover:border-cipher-500/40'
            }`}
            title={pinned ? 'Unpin room' : 'Pin room'}
            aria-label={pinned ? 'Unpin room' : 'Pin room'}
          >
            {pinned ? <Pin size={15} /> : <PinOff size={15} />}
          </button>

          {/* Games toggle */}
          <div className="relative">
            {!gamesOpen && (opponentGameUnseen || bothOnline) && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                title={opponentGameUnseen ? 'Your partner started a game — tap to join' : undefined}
                className={`pointer-events-none absolute -top-1 -right-1 rounded-full bg-cipher-500 ring-2 ring-ink-900 animate-pulse-soft ${
                  opponentGameUnseen ? 'w-3 h-3' : 'w-2.5 h-2.5'
                }`}
              />
            )}
            <button
              onClick={onToggleGames}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                gamesOpen
                  ? 'bg-cipher-500 text-ink-950'
                  : 'bg-ink-800 border border-ink-600 text-mist-300 hover:border-cipher-500/60'
              }`}
            >
              <Gamepad2 size={15} />
              <span className="hidden sm:inline">Minigames</span>
            </button>
          </div>

          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-medium text-mist-300 hover:border-danger/60 hover:text-danger transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Rename modal */}
      <AnimatePresence>
        {nameModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setNameModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-800 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-sm tracking-widest text-mist-100 mb-1">NAME THIS ROOM</h3>
                <p className="text-xs text-mist-500 mb-4">Give this room a personal nickname so you can find it easily later.</p>
                <input
                  ref={labelInputRef}
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setNameModalOpen(false); }}
                  placeholder={roomId}
                  maxLength={40}
                  className="w-full rounded-lg bg-ink-900 border border-ink-600 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500 outline-none transition-colors mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setNameModalOpen(false)}
                    className="flex-1 rounded-lg border border-ink-600 text-mist-400 text-sm py-2 hover:border-mist-500 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveLabel}
                    className="flex-1 rounded-lg bg-signal-500 hover:bg-signal-300 text-ink-950 font-semibold text-sm py-2 transition-colors cursor-pointer"
                  >
                    Save name
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
