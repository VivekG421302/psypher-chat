import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_HREF = '/favicon.svg';
const BADGE_HREF = '/favicon-badge.svg';

/**
 * Swaps the tab favicon between the normal icon and a green-dot "unread"
 * variant. Call the returned setter with `true` when a new message arrives
 * while the tab is hidden/unfocused, and it auto-clears the badge the
 * moment the tab regains focus/visibility.
 */
export function useFaviconBadge() {
  const unread = useRef(false);

  const apply = useCallback((val) => {
    unread.current = val;
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = val ? BADGE_HREF : DEFAULT_HREF;
  }, []);

  useEffect(() => {
    function clearIfVisible() {
      if (unread.current && document.visibilityState === 'visible' && document.hasFocus()) {
        apply(false);
      }
    }
    document.addEventListener('visibilitychange', clearIfVisible);
    window.addEventListener('focus', clearIfVisible);
    return () => {
      document.removeEventListener('visibilitychange', clearIfVisible);
      window.removeEventListener('focus', clearIfVisible);
    };
  }, [apply]);

  return apply;
}
