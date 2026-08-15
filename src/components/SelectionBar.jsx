import { motion } from 'framer-motion';
import { X, Copy, Trash2, CheckSquare } from 'lucide-react';

export default function SelectionBar({
  count,
  totalSelectable,
  allSelectedAreMine,
  onCancel,
  onCopy,
  onDelete,
  onSelectAll,
}) {
  const allSelected = count > 0 && count === totalSelectable;

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
        className="flex items-center gap-1.5 text-mist-400 hover:text-mist-100 text-sm transition-colors cursor-pointer"
      >
        <X size={16} />
        Cancel
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onSelectAll}
          className={`flex items-center gap-1.5 text-xs rounded-lg border px-3 py-1.5 transition-colors cursor-pointer ${
            allSelected
              ? 'border-signal-500/60 text-signal-500 bg-signal-700/10'
              : 'border-ink-600 text-mist-400 hover:border-signal-500/40'
          }`}
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          <CheckSquare size={14} />
          {allSelected ? 'All' : 'Select all'}
        </button>
        <span className="text-sm text-mist-300 min-w-[4ch] text-center">{count} sel.</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          disabled={count === 0}
          className="flex items-center gap-1.5 text-xs rounded-lg border border-ink-600 px-3 py-1.5 text-mist-300 hover:border-signal-500/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <Copy size={14} /> Copy
        </button>
        <button
          onClick={onDelete}
          disabled={count === 0 || !allSelectedAreMine}
          title={!allSelectedAreMine && count > 0 ? 'You can only delete your own messages' : undefined}
          className="flex items-center gap-1.5 text-xs rounded-lg border border-danger/50 px-3 py-1.5 text-danger hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </motion.div>
  );
}
