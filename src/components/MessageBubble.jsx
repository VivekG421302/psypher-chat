import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Trash2, Copy, Smile, Check, CheckSquare, Gamepad2, Trophy } from 'lucide-react';
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
function RichText({ text }) {
  // Handle image messages
  if (text?.startsWith('[image]data:image')) {
    return (
      <img
        src={text.slice('[image]'.length)}
        alt="Shared image"
        className="max-w-full rounded-lg max-h-56 object-contain"
        loading="lazy"
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
  const isImage = m.text?.startsWith('[image]data:image');

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
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed select-none sm:select-text cursor-pointer sm:cursor-auto [word-break:break-word] [overflow-wrap:anywhere] ${
            selected ? 'ring-2 ring-signal-500' : ''
          } ${
            m.mine
              ? 'bg-signal-500 text-ink-950 rounded-br-md'
              : m.failed
              ? 'bg-danger/10 border border-danger/30 text-danger rounded-bl-md'
              : 'bg-ink-700 text-mist-100 rounded-bl-md'
          }`}
        >
          <RichText text={m.text} />
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 px-1">
          <span className="text-[10px] text-mist-700">{formatTime(m.ts)}</span>
          {m.edited && <span className="text-[10px] text-mist-700 italic">edited</span>}
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
              {!isImage && (
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
