import { useEffect, useRef, useState } from 'react';

const GLYPHS = '!<>-_\\/[]{}—=+*^?#________ABCDEF0123456789';

/**
 * Signature moment: text resolves letter-by-letter from scrambled cipher
 * noise into its final value, like a decryption terminal. Used sparingly
 * — hero headline + room-code reveal only.
 */
export default function DecryptText({ text, as: Tag = 'span', className = '', speed = 28, trigger = true }) {
  const [display, setDisplay] = useState(text);
  const frame = useRef(0);
  const raf = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (!trigger || prefersReducedMotion.current) {
      setDisplay(text);
      return;
    }

    let iteration = 0;
    frame.current = 0;
    const totalFrames = text.length * speed;

    function tick() {
      frame.current++;
      const progress = frame.current / speed;
      iteration = progress;

      const next = text
        .split('')
        .map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < iteration) return text[i];
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');

      setDisplay(next);

      if (frame.current < totalFrames) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, trigger]);

  return <Tag className={className}>{display}</Tag>;
}
