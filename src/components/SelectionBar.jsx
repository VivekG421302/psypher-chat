import { motion } from 'framer-motion';
import { X, Copy, Trash2 } from 'lucide-react';

export default function SelectionBar({ count, allSelectedAreMine, onCancel, onCopy, onDelete }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="border-t border-ink-700 bg-ink-900 px-3 py-2.5 flex items-center justify-between gap-3 shrink-0"
    >
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-mist-400 hover:text-mist-100 text-sm transition-colors enabled:cursor-pointer"
      >
        <X size={16} />
        Cancel
      </button>
      <span className="text-sm text-mist-300">{count} selected</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          disabled={count === 0}
          className="flex items-center gap-1.5 text-xs rounded-lg border border-ink-600 px-3 py-1.5 text-mist-300 hover:border-signal-500/60 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors"
        >
          <Copy size={14} /> Copy
        </button>
        <button
          onClick={onDelete}
          disabled={count === 0 || !allSelectedAreMine}
          title={!allSelectedAreMine && count > 0 ? "You can only delete your own messages" : undefined}
          className="flex items-center gap-1.5 text-xs rounded-lg border border-danger/50 px-3 py-1.5 text-danger hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </motion.div>
  );
}
