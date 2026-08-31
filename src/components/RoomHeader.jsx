import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, LogOut, Gamepad2, ShieldCheck, Users, Pin, PinOff, MessageSquare, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext.jsx';
import { useDirectory } from '../context/DirectoryContext.jsx';
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
  const [copied,    setCopied]    = useState(false);
  const [pinned,    setPinned]    = useState(false);
  const [roomLabel, setRoomLabel] = useState('');
  const navigate       = useNavigate();
  const { openDirectory } = useDirectory();
  const { notify }     = useToast();

  // Load saved pin/label from storage whenever roomId changes
  useEffect(() => {
    const saved = loadRooms()[roomId];
    if (saved) {
      setPinned(!!saved.pinned);
      setRoomLabel(saved.label || '');
    }
  }, [roomId]);

  function copyCode() {
    navigator.clipboard?.writeText(roomId);
    setCopied(true);
    notify('Room code copied.', 'success', 1800);
    setTimeout(() => setCopied(false), 1600);
  }

  function handleLeave() { onLeave(); navigate('/'); }

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    rememberRoom(roomId, { pinned: next });
    notify(next ? 'Room pinned.' : 'Room unpinned.', 'success', 1500);
  }

  const connectedCount = members.filter(m => m.connected).length;
  const bothOnline     = connectedCount >= 2;
  const displayLabel   = roomLabel && roomLabel !== roomId ? roomLabel : roomId;

  return (
    <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-900/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
      {/* Left: room code + online indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <ShieldCheck size={18} className="text-signal-500 shrink-0" />

        <button onClick={copyCode}
          className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 hover:border-signal-500/60 transition-colors group cursor-pointer max-w-[140px] sm:max-w-none"
          title="Copy room code">
          {pinned && <Pin size={12} className="text-cipher-500 shrink-0" />}
          <span className="font-display text-xs sm:text-sm tracking-widest text-mist-100 truncate">{displayLabel}</span>
          {copied
            ? <Check size={14} className="text-cipher-500 shrink-0" />
            : <Copy  size={14} className="text-mist-500 group-hover:text-signal-500 shrink-0" />}
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-mist-500">
          <span className="relative flex items-center justify-center w-3.5 h-3.5">
            {bothOnline && <span className="absolute inline-flex h-full w-full rounded-full bg-cipher-500 opacity-40 animate-ping" />}
            <span className={`relative inline-flex rounded-full w-2 h-2 ${bothOnline ? 'bg-cipher-500' : connectedCount === 1 ? 'bg-signal-500' : 'bg-mist-700'}`} />
          </span>
          <Users size={13} />
          <span>{connectedCount}/2 online</span>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5">
        {/* Mobile chat/game toggle */}
        {gamesOpen && (
          <div className="flex lg:hidden items-center gap-0.5 rounded-lg border border-ink-700 bg-ink-800 p-0.5">
            <button onClick={() => setMobileView('chat')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${mobileView === 'chat' ? 'bg-signal-500 text-ink-950' : 'text-mist-400 hover:text-mist-100'}`}>
              <MessageSquare size={13} /><span>Chat</span>
            </button>
            <button onClick={() => setMobileView('game')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${mobileView === 'game' ? 'bg-cipher-500 text-ink-950' : 'text-mist-400 hover:text-mist-100'}`}>
              <Gamepad2 size={13} /><span>Game</span>
            </button>
          </div>
        )}

        {/* Saved rooms directory */}
        <button onClick={openDirectory}
          className="p-1.5 rounded-lg border border-ink-600 text-mist-400 hover:text-cipher-500 hover:border-cipher-500/40 transition-colors cursor-pointer"
          title="Saved rooms" aria-label="Open saved rooms">
          <Bookmark size={15} />
        </button>

        {/* Pin this room */}
        <button onClick={togglePin}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${pinned ? 'border-cipher-500/50 text-cipher-500 bg-cipher-700/10' : 'border-ink-600 text-mist-400 hover:text-mist-100 hover:border-cipher-500/40'}`}
          title={pinned ? 'Unpin room' : 'Pin room'}>
          {pinned ? <Pin size={15} /> : <PinOff size={15} />}
        </button>

        {/* Minigames */}
        <div className="relative">
          {!gamesOpen && (opponentGameUnseen || bothOnline) && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              title={opponentGameUnseen ? 'Your partner started a game — tap to join' : undefined}
              className={`pointer-events-none absolute -top-1 -right-1 rounded-full bg-cipher-500 ring-2 ring-ink-900 animate-pulse-soft ${opponentGameUnseen ? 'w-3 h-3' : 'w-2.5 h-2.5'}`}
            />
          )}
          <button onClick={onToggleGames}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${gamesOpen ? 'bg-cipher-500 text-ink-950' : 'bg-ink-800 border border-ink-600 text-mist-300 hover:border-cipher-500/60'}`}>
            <Gamepad2 size={15} />
            <span className="hidden sm:inline">Minigames</span>
          </button>
        </div>

        {/* Leave */}
        <button onClick={handleLeave}
          className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-medium text-mist-300 hover:border-danger/60 hover:text-danger transition-colors cursor-pointer">
          <LogOut size={15} />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
}
