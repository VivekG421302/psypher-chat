import { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Trash2, Copy, Smile, Check, CheckSquare, Gamepad2, Trophy, Reply, Download, FileText, File, Music, Video, CheckCheck, Play, Pause } from 'lucide-react';
import Avatar from './Avatar.jsx';
import QuickReactBar from './QuickReactBar.jsx';
import { useLongPress } from '../lib/useLongPress.js';
import { renderInlineMarkdown } from '../lib/richText.jsx';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Render message text with inline markdown:
 *   *bold*, _italic_, ~strikethrough~, #underline# (combinable), and
 *   numbered lists preserved across newlines.
 */
function fileTypeIcon(mime) {
  if (!mime) return File;
  if (mime.startsWith('audio/')) return Music;
  if (mime.startsWith('video/')) return Video;
  if (mime.includes('pdf') || mime.includes('text')) return FileText;
  return File;
}


// ── Video player — proper Blob URL lifecycle with useEffect ───────────────────
function VideoPlayer({ dataUrl, mime, name, mine, download }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    let url = null;
    try {
      if (dataUrl?.startsWith('data:')) {
        const arr   = dataUrl.split(',');
        const bstr  = atob(arr[1]);
        const u8    = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        url = URL.createObjectURL(new Blob([u8], { type: mime }));
      } else {
        url = dataUrl;
      }
    } catch { url = dataUrl; }
    setBlobUrl(url);
    return () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [dataUrl, mime]);

  return (
    <div className="rounded-2xl overflow-hidden max-w-[280px] w-full bg-black">
      {blobUrl ? (
        <video controls src={blobUrl} playsInline preload="metadata"
          className="w-full max-h-56 bg-black block" style={{ display: 'block' }} />
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-ink-900">
          <div className="w-6 h-6 border-2 border-mist-600 border-t-mist-300 rounded-full animate-spin" />
        </div>
      )}
      <div className={`flex items-center justify-between px-3 py-2 ${mine ? 'bg-ink-950/30' : 'bg-ink-800/70'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Video size={11} className={mine ? 'text-ink-400 shrink-0' : 'text-mist-500 shrink-0'} />
          <p className={`text-[10px] truncate ${mine ? 'text-ink-300' : 'text-mist-400'}`}>{name}</p>
        </div>
        <button onClick={download}
          className="text-mist-500 hover:text-mist-100 cursor-pointer ml-2 shrink-0 transition-colors">
          <Download size={12} />
        </button>
      </div>
    </div>
  );
}


// ── Voice note player ─────────────────────────────────────────────────────────
function VoiceNotePlayer({ dataUrl, mime, mine }) {
  const audioRef  = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);   // 0–1
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const rafRef = useRef(null);

  // Convert base64 → Blob URL once
  const src = useRef('');
  if (!src.current) {
    try {
      if (dataUrl?.startsWith('data:')) {
        const arr = dataUrl.split(',');
        const bstr = atob(arr[1]);
        const u8 = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        src.current = URL.createObjectURL(new Blob([u8], { type: mime }));
      } else {
        src.current = dataUrl || '';
      }
    } catch { src.current = dataUrl || ''; }
  }

  const tick = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
    setProgress(el.duration ? el.currentTime / el.duration : 0);
    if (!el.paused) rafRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = () => {
    const el = audioRef.current; if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); rafRef.current = requestAnimationFrame(tick); }
    else           { el.pause(); setPlaying(false); cancelAnimationFrame(rafRef.current); }
  };

  const seek = (e) => {
    const el = audioRef.current; if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
    setCurrent(el.currentTime);
  };

  const fmt = (s) => {
    const t = isFinite(s) ? Math.round(s) : 0;
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  };

  // Bar heights — fake waveform from a seeded pattern
  const BARS = 28;
  const heights = Array.from({ length: BARS }, (_, i) =>
    30 + Math.round(Math.abs(Math.sin(i * 0.7 + 1.3) * 55 + Math.cos(i * 1.1) * 20))
  );

  const accent = mine ? 'bg-ink-950' : 'bg-signal-500';
  const dim    = mine ? 'bg-ink-950/30' : 'bg-signal-500/30';

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 min-w-[220px] max-w-[280px]`}>
      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90 ${
          mine ? 'bg-ink-950/30 hover:bg-ink-950/50' : 'bg-signal-500/20 hover:bg-signal-500/30'
        }`}
      >
        {playing
          ? <Pause  size={16} className={mine ? 'text-ink-100' : 'text-signal-400'} />
          : <Play   size={16} className={mine ? 'text-ink-100' : 'text-signal-400'} style={{ marginLeft: 2 }} />
        }
      </button>

      {/* Waveform + progress */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Waveform bars — clickable scrubber */}
        <div
          className="flex items-center gap-[2px] h-8 cursor-pointer"
          onClick={seek}
        >
          {heights.map((h, i) => {
            const filled = i / BARS < progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors ${filled ? accent : dim}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        {/* Time */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono ${mine ? 'text-ink-300' : 'text-mist-500'}`}>
            {playing || current > 0 ? fmt(current) : fmt(duration)}
          </span>
          <span className={`text-[10px] ${mine ? 'text-ink-400/60' : 'text-mist-600'}`}>
            Voice note
          </span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src.current}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); cancelAnimationFrame(rafRef.current); }}
      />
    </div>
  );
}

function FileCard({ text, mine }) {
  // [file]mime|name|dataUrl
  const raw    = text.slice('[file]'.length);
  const first  = raw.indexOf('|');
  const second = raw.indexOf('|', first + 1);
  const mime    = raw.slice(0, first);
  const name    = raw.slice(first + 1, second);
  const dataUrl = raw.slice(second + 1);
  const Icon    = fileTypeIcon(mime);
  const ext     = name.split('.').pop()?.toUpperCase() || 'FILE';
  const isAudio = mime.startsWith('audio/');
  const isVideo = mime.startsWith('video/');

  function download() {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = name; a.click();
  }

  // ── Audio: custom voice note player ─────────────────────────────────────────
  if (isAudio) {
    return <VoiceNotePlayer dataUrl={dataUrl} mime={mime} mine={mine} />;
  }

  // ── Video: component with proper Blob URL lifecycle ──────────────────────────
  if (isVideo) {
    return <VideoPlayer dataUrl={dataUrl} mime={mime} name={name} mine={mine} download={download} />;
  }

  // ── Generic file ───────────────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-w-[180px] ${mine ? 'bg-ink-950/20' : 'bg-ink-800/60'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mine ? 'bg-ink-950/30' : 'bg-ink-700'}`}>
        <Icon size={18} className={mine ? 'text-ink-300' : 'text-mist-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${mine ? 'text-ink-100' : 'text-mist-100'}`}>{name}</p>
        <p className={`text-[10px] ${mine ? 'text-ink-400' : 'text-mist-600'}`}>{ext}</p>
      </div>
      <button onClick={download}
        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${mine ? 'hover:bg-ink-950/30 text-ink-300' : 'hover:bg-ink-700 text-mist-400 hover:text-mist-100'}`}
        title="Download">
        <Download size={14} />
      </button>
    </div>
  );
}

function RichText({ text, mine }) {
  // GIF from Giphy
  if (text?.startsWith('[gif]')) {
    return (
      <img src={text.slice(5)} alt="GIF"
        className="max-w-full rounded-xl max-h-56 object-contain"
        loading="lazy"
        draggable={false}
      />
    );
  }
  // File (audio / video / document)
  if (text?.startsWith('[file]')) {
    return <FileCard text={text} mine={mine} />;
  }
  // Image (base64 or URL)
  if (text?.startsWith('[image]')) {
    return (
      <img src={text.slice(7)} alt="Image"
        className="max-w-full rounded-xl max-h-64 object-contain"
        loading="lazy"
        draggable={false}
      />
    );
  }

  if (!text) return null;

  const lines = text.split('\n');
  return (
    <span className="whitespace-pre-wrap" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {renderInlineMarkdown(line, `l${li}`)}
        </span>
      ))}
    </span>
  );
}

export default function MessageBubble({
  message: m,
  myUserId,
  selectMode,
  selected,
  onToggleSelect,
  onEnterSelectMode,
  onEdit,
  onDelete,
  onReact,
  onCopy,
  onJoinGame,
  onReply,
  opponentSeenUpTo = 0,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactBar, setShowReactBar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const longPress = useLongPress(() => {
    if (!selectMode) setShowActions(true);
  });

  if (m.kind === 'game-invite') {
    return (
      <div className="flex justify-center px-2">
        <div className="w-full max-w-xs rounded-2xl border border-cipher-700/50 bg-cipher-950/30 overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <div className="w-8 h-8 rounded-xl bg-cipher-700/20 border border-cipher-700/40 flex items-center justify-center shrink-0">
              <Gamepad2 size={15} className="text-cipher-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-mist-100 capitalize">{m.gameId}</p>
              <p className="text-[10px] text-mist-600 mt-0.5">{m.starterName} started a game</p>
            </div>
            <button
              onClick={() => onJoinGame?.(m.gameId)}
              className="shrink-0 rounded-xl bg-cipher-500 hover:bg-cipher-400 active:scale-95 text-ink-950 text-[11px] font-bold px-3 py-1.5 transition-all cursor-pointer"
            >
              Join →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (m.kind === 'game-result') {
    return (
      <div className="flex justify-center px-2">
        <div className="w-full max-w-xs rounded-2xl border border-signal-700/40 bg-signal-950/20 overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <div className="w-8 h-8 rounded-xl bg-signal-700/20 border border-signal-700/40 flex items-center justify-center shrink-0">
              <Trophy size={15} className="text-signal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-signal-300">🏆 {m.winnerName} won!</p>
              <p className="text-[10px] text-mist-600 mt-0.5 capitalize">{m.gameId || 'Game'}{m.loserName ? ` · beat ${m.loserName}` : ''}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (m.kind === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-mist-700 bg-ink-800/60 rounded-full px-3 py-1">{m.text}</span>
      </div>
    );
  }

  if (m.kind === 'deleted') {
    return (
      <div className={`flex items-end gap-2 ${m.mine ? 'flex-row-reverse' : ''}`}>
        <div className="max-w-[72%] sm:max-w-[60%]">
          <div className="rounded-2xl px-3.5 py-2 text-sm italic text-mist-700 border border-dashed border-ink-600">
            This message was deleted
          </div>
        </div>
      </div>
    );
  }

  const reactionEntries = Object.entries(m.reactions || {}).filter(([, users]) => users.length > 0);
  const isImage = m.text?.startsWith('[image]');
  const isGif   = m.text?.startsWith('[gif]');
  const isFile  = m.text?.startsWith('[file]') || isGif;

  function handleClick() {
    if (longPress.didLongPress()) return;
    if (selectMode) {
      onToggleSelect(m.id);
    } else {
      setShowActions((v) => !v);
    }
  }

  function handleDoubleClick() {
    if (selectMode) return;
    onReact(m.id, '❤️');
  }

  return (
    <div
      className={`group relative flex items-end gap-2 ${m.mine ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => !selectMode && setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactBar(false);
      }}
    >
      {selectMode && (
        <button
          onClick={() => onToggleSelect(m.id)}
          className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
            selected ? 'bg-signal-500 border-signal-500' : 'border-ink-500'
          }`}
          aria-label="Select message"
        >
          {selected && <Check size={12} className="text-ink-950" />}
        </button>
      )}

      <Avatar name={m.senderName} color={m.senderColor} size={28} />

      <div className={`relative max-w-[72%] sm:max-w-[60%] flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
        {!m.mine && <span className="text-[11px] text-mist-500 mb-0.5 px-1">{m.senderName}</span>}

        <div
          {...longPress}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowActions((v) => !v);
          }}
          className={`rounded-2xl text-sm leading-relaxed select-none sm:select-text cursor-pointer sm:cursor-auto [word-break:break-word] [overflow-wrap:anywhere] ${
            isGif || isImage ? 'p-0 overflow-hidden bg-transparent' : 'px-3.5 py-2'
          } ${
            selected ? 'ring-2 ring-signal-500' : ''
          } ${
            isGif || isImage
              ? ''
              : m.mine
              ? 'bg-signal-500 text-ink-950 rounded-br-md'
              : m.failed
              ? 'bg-danger/10 border border-danger/30 text-danger rounded-bl-md'
              : 'bg-ink-700 text-mist-100 rounded-bl-md'
          }`}
        >
          {m.replyTo && (
            <div className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-xs border-l-2 ${m.mine ? 'border-ink-950/40 bg-ink-950/20' : 'border-signal-500/50 bg-signal-700/10'}`}>
              <p className="font-semibold opacity-70 mb-0.5 truncate">{m.replyTo.senderName}</p>
              <p className="opacity-60 truncate">{m.replyTo.text?.startsWith('[image]') ? '📷 Image' : m.replyTo.text}</p>
            </div>
          )}
          <RichText text={m.text} mine={m.mine} />
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 px-1">
          <span className="text-[10px] text-mist-700">{formatTime(m.ts)}</span>
          {m.edited && <span className="text-[10px] text-mist-700 italic">edited</span>}
          {m.mine && m.kind === 'message' && (
            <span className="text-[10px]">
              {opponentSeenUpTo >= m.ts
                ? <CheckCheck size={12} className="text-cipher-500" title="Seen" />
                : <Check size={12} className="text-mist-600" title="Sent" />
              }
            </span>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${m.mine ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(m.id, emoji)}
                className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-colors cursor-pointer ${
                  users.includes(myUserId)
                    ? 'bg-signal-700/20 border-signal-500/50 text-signal-500'
                    : 'bg-ink-800 border-ink-600 text-mist-400 hover:border-mist-500'
                }`}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action toolbar */}
        <AnimatePresence>
          {!selectMode && showActions && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className={`absolute -top-9 z-10 flex items-center gap-0.5 rounded-full border border-ink-600 bg-ink-800 p-1 shadow-lg ${
                m.mine ? 'right-0' : 'left-0'
              }`}
            >
              <button
                onClick={() => setShowReactBar((v) => !v)}
                className="p-1.5 rounded-full text-mist-400 hover:text-signal-500 hover:bg-ink-700 transition-colors cursor-pointer"
                aria-label="React"
              >
                <Smile size={14} />
              </button>
              <button
                onClick={() => { onReply?.(m); setShowActions(false); }}
                className="p-1.5 rounded-full text-mist-400 hover:text-cipher-500 hover:bg-ink-700 transition-colors cursor-pointer"
                aria-label="Reply"
              >
                <Reply size={14} />
              </button>
              {!isImage && !isFile && (
                <button
                  onClick={() => onCopy(m.text)}
                  className="p-1.5 rounded-full text-mist-400 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
                  aria-label="Copy"
                >
                  <Copy size={14} />
                </button>
              )}
              <button
                onClick={() => {
                  setShowActions(false);
                  onEnterSelectMode(m.id);
                }}
                className="p-1.5 rounded-full text-mist-400 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
                aria-label="Select"
              >
                <CheckSquare size={14} />
              </button>
              {m.mine && !m.failed && !isImage && (
                <button
                  onClick={() => onEdit(m)}
                  className="p-1.5 rounded-full text-mist-400 hover:text-cipher-500 hover:bg-ink-700 transition-colors cursor-pointer"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
              )}
              {m.mine && (
                <button
                  onClick={() => {
                    if (confirmDelete) {
                      onDelete(m.id);
                      setConfirmDelete(false);
                    } else {
                      setConfirmDelete(true);
                      setTimeout(() => setConfirmDelete(false), 2500);
                    }
                  }}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    confirmDelete ? 'text-danger bg-danger/10' : 'text-mist-400 hover:text-danger hover:bg-ink-700'
                  }`}
                  aria-label={confirmDelete ? 'Confirm delete' : 'Delete'}
                  title={confirmDelete ? 'Click again to confirm' : 'Delete'}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReactBar && (
            <QuickReactBar
              className={`absolute -top-20 z-20 ${m.mine ? 'right-0' : 'left-0'}`}
              onPick={(emoji) => {
                onReact(m.id, emoji);
                setShowReactBar(false);
                setShowActions(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
