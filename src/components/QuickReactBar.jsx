import { motion } from 'framer-motion';

export const QUICK_EMOJIS = [
  // Classic reactions
  '❤️', '😂', '👍', '😮', '😢', '🔥',
  // Game emotions
  '🤣', '😈', '💀', '🎉', '😤', '🤯',
  '😎', '🥶', '😭', '🫠', '👀', '🃏',
];

export default function QuickReactBar({ onPick, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      className={`grid grid-cols-6 gap-0.5 rounded-2xl border border-ink-600 bg-ink-800 px-2 py-2 shadow-xl w-52 ${className}`}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPick(emoji);
          }}
          className="text-xl leading-none p-1.5 rounded-xl hover:bg-ink-700 hover:scale-125 transition-transform enabled:cursor-pointer"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}
