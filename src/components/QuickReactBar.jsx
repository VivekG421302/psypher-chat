import { motion } from 'framer-motion';

export const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

export default function QuickReactBar({ onPick, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      className={`flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-2 py-1.5 shadow-lg ${className}`}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPick(emoji);
          }}
          className="text-lg leading-none p-1 rounded-full hover:bg-ink-700 hover:scale-125 transition-transform enabled:cursor-pointer"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}
