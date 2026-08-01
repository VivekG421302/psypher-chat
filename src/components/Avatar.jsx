export default function Avatar({ name, color, size = 36, ring = false }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-display font-semibold text-ink-950 ${
        ring ? 'ring-2 ring-cipher-500/70 ring-offset-2 ring-offset-ink-900' : ''
      }`}
      style={{ width: size, height: size, background: color || '#8B95A1', fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
