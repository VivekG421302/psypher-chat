const COLOR_MAP = {
  R: { bg: '#D6373F', text: '#fff' },
  Y: { bg: '#E8B93D', text: '#241a00' },
  G: { bg: '#2E9E63', text: '#fff' },
  B: { bg: '#3576E0', text: '#fff' },
  wild: { bg: 'linear-gradient(135deg,#D6373F,#E8B93D,#2E9E63,#3576E0)', text: '#fff' },
};

const LABELS = { skip: 'Ø', reverse: '⇄', '+2': '+2', wild: '★', 'wild+4': '+4' };

export default function UnoCard({ card, onClick, disabled, faceDown, size = 'md', selected }) {
  if (faceDown) {
    return (
      <div
        className={`rounded-lg border-2 border-ink-600 bg-ink-700 flex items-center justify-center shrink-0 cursor-default ${
          size === 'sm' ? 'w-8 h-12' : 'w-11 h-16'
        }`}
      >
        <span className="text-signal-500 text-xs font-display">?</span>
      </div>
    );
  }

  const palette = COLOR_MAP[card.color] || COLOR_MAP.wild;
  const label = LABELS[card.value] || card.value;
  const sizeClasses = size === 'sm' ? 'w-10 h-14 text-sm' : 'w-14 h-20 text-lg';

  // No onClick means this is a display-only card (e.g. the discard pile) —
  // render it as a plain, non-focusable div so it never shows an
  // interactive cursor or a11y focus ring for something that isn't
  // actually clickable.
  if (!onClick) {
    return (
      <div
        style={{ background: palette.bg, color: palette.text }}
        className={`rounded-lg border-2 border-white/20 flex items-center justify-center font-display font-bold shrink-0 cursor-default ${sizeClasses}`}
      >
        {label}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ background: palette.bg, color: palette.text }}
      className={`rounded-lg border-2 flex items-center justify-center font-display font-bold shrink-0 transition-transform ${sizeClasses} ${
        selected ? '-translate-y-2 border-cipher-500' : 'border-white/20'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-1.5 cursor-pointer'}`}
    >
      {label}
    </button>
  );
}
