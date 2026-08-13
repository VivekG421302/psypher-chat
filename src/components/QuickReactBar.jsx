import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import EmojiPicker from './EmojiPicker.jsx';

export const QUICK_EMOJIS = [
  // Classic reactions
  '❤️', '😂', '👍', '😮', '😢', '🔥',
  // Game emotions
  '🤣', '😈', '💀', '🎉', '😤', '🤯',
  '😎', '🥶', '😭', '🫠', '👀', '🃏',
];

export default function QuickReactBar({ onPick, className = '' }) {
  const [morePickerOpen, setMorePickerOpen] = useState(false);
  const wrapRef = useRef(null);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.12 }}
        className="grid grid-cols-7 gap-0.5 rounded-2xl border border-ink-600 bg-ink-800 px-2 py-2 shadow-xl w-60"
      >
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPick(emoji);
            }}
            className="text-xl leading-none p-1.5 rounded-xl hover:bg-ink-700 hover:scale-125 active:scale-95 transition-transform enabled:cursor-pointer"
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMorePickerOpen((v) => !v);
          }}
          title="More emoji"
          aria-label="More emoji"
          className={`flex items-center justify-center rounded-xl transition-colors enabled:cursor-pointer ${
            morePickerOpen ? 'bg-signal-700/25 text-signal-500' : 'text-mist-500 hover:text-mist-100 hover:bg-ink-700'
          }`}
        >
          <Plus size={16} />
        </button>
      </motion.div>

      <AnimatePresence>
        {morePickerOpen && (
          <EmojiPicker
            compact
            className="absolute top-full mt-2 right-0 z-30"
            onPick={(emoji) => {
              onPick(emoji);
              setMorePickerOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
