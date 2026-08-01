import { useEffect, useState } from 'react';

/**
 * On mobile, `100vh` / `h-screen` measure the *layout* viewport, which many
 * browsers don't shrink when the on-screen keyboard opens — so a flex column
 * sized with vh keeps reserving space behind the keyboard, and the last
 * flex item (the message input) gets pushed out of view with a dead gap
 * where it used to be. The Visual Viewport API reports the actual visible
 * area, updated live as the keyboard animates in and out.
 */
export function useViewportHeight() {
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    function update() {
      setHeight(vv.height);
      // Keep the page itself from scrolling away from the top when the
      // keyboard opens (iOS in particular likes to do this).
      window.scrollTo(0, 0);
    }

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}
