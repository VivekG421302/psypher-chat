import { useRef } from 'react';

export function useLongPress(onLongPress, { delay = 450 } = {}) {
  const timer = useRef(null);
  const firedRef = useRef(false);

  function start(e) {
    firedRef.current = false;
    timer.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress(e);
    }, delay);
  }

  function clear() {
    if (timer.current) clearTimeout(timer.current);
  }

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    didLongPress: () => firedRef.current,
  };
}
