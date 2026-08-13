/**
 * Branded loading indicator — a soft dual-ring spinner in the app's accent
 * colors, standing in for the generic <Loader2 className="animate-spin" />
 * used throughout. `light` renders in ink-950 for use on solid signal-500
 * buttons; otherwise it renders in the signal accent color.
 */
export default function Spinner({ size = 20, light = false, className = '' }) {
  const track = light ? 'rgba(10,13,17,0.25)' : 'rgba(232,163,61,0.18)';
  const head = light ? '#0a0d11' : '#e8a33d';
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} className="animate-spin-slow">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke={track} strokeWidth="3" />
        <path
          d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
          fill="none"
          stroke={head}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
