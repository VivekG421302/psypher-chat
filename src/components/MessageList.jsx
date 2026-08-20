import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MessageBubble from './MessageBubble.jsx';

export default function MessageList({
  messages,
  typingUser,
  viewportHeight,
  myUserId,
  selectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
  onEdit,
  onDelete,
  onReact,
  onCopy,
  onJoinGame,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingUser, viewportHeight]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full flex flex-col items-center justify-center text-center text-mist-700 gap-2 py-16"
        >
          <p className="font-display text-xs tracking-widest text-mist-500">ROOM IS EMPTY</p>
          <p className="text-sm max-w-xs">
            Send the first message — it's encrypted the instant you hit enter.
          </p>
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div
            key={m.id}
            layout="position"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <MessageBubble
              message={m}
              myUserId={myUserId}
              selectMode={selectMode}
              selected={selectedIds?.has(m.id)}
              onToggleSelect={onToggleSelect}
              onEnterSelectMode={onEnterSelectMode}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onCopy={onCopy}
              onJoinGame={onJoinGame}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {typingUser && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 text-xs text-mist-500 pl-1"
        >
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-pulse-soft" />
            <span className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-pulse-soft [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-pulse-soft [animation-delay:0.3s]" />
          </span>
          {typingUser} is typing…
        </motion.div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
