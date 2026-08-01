import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Avatar from './Avatar.jsx';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageList({ messages, typingUser }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingUser]);

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

      {messages.map((m) =>
        m.kind === 'system' ? (
          <div key={m.id} className="flex justify-center">
            <span className="text-[11px] text-mist-700 bg-ink-800/60 rounded-full px-3 py-1">
              {m.text}
            </span>
          </div>
        ) : (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex items-end gap-2 ${m.mine ? 'flex-row-reverse' : ''}`}
          >
            <Avatar name={m.senderName} color={m.senderColor} size={28} />
            <div className={`max-w-[72%] sm:max-w-[60%] flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
              {!m.mine && <span className="text-[11px] text-mist-500 mb-0.5 px-1">{m.senderName}</span>}
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
                  m.mine
                    ? 'bg-signal-500 text-ink-950 rounded-br-md'
                    : m.failed
                      ? 'bg-danger/10 border border-danger/30 text-danger rounded-bl-md'
                      : 'bg-ink-700 text-mist-100 rounded-bl-md'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-mist-700 mt-0.5 px-1">{formatTime(m.ts)}</span>
            </div>
          </motion.div>
        )
      )}

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
