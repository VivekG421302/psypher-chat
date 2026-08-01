import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, LogOut, Gamepad2, ShieldCheck, Users } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

export default function RoomHeader({ roomId, members, onLeave, onToggleGames, gamesOpen }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { notify } = useToast();

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

  const connectedCount = members.filter((m) => m.connected).length;

  return (
    <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-900/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <ShieldCheck size={18} className="text-signal-500 shrink-0" />
        <button
          onClick={copyCode}
          className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 hover:border-signal-500/60 transition-colors group"
          title="Copy room code"
        >
          <span className="font-display text-sm tracking-widest text-mist-100">{roomId}</span>
          {copied ? (
            <Check size={14} className="text-cipher-500" />
          ) : (
            <Copy size={14} className="text-mist-500 group-hover:text-signal-500" />
          )}
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-mist-500">
          <Users size={14} />
          <span>{connectedCount}/2 online</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleGames}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            gamesOpen
              ? 'bg-cipher-500 text-ink-950'
              : 'bg-ink-800 border border-ink-600 text-mist-300 hover:border-cipher-500/60'
          }`}
        >
          <Gamepad2 size={15} />
          <span className="hidden sm:inline">Minigames</span>
        </button>
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-medium text-mist-300 hover:border-danger/60 hover:text-danger transition-colors"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
}
