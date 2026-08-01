import { useEffect, useRef } from 'react';
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
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingUser, viewportHeight]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center text-mist-700 gap-2 py-16">
          <p className="font-display text-xs tracking-widest text-mist-500">ROOM IS EMPTY</p>
          <p className="text-sm max-w-xs">
            Send the first message — it's encrypted the instant you hit enter.
          </p>
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble
          key={m.id}
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
        />
      ))}

      {typingUser && (
        <div className="flex items-center gap-2 text-xs text-mist-500 pl-1">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-pulse-soft" />
            <span className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-pulse-soft [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-pulse-soft [animation-delay:0.3s]" />
          </span>
          {typingUser} is typing…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
