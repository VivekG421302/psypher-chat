import { useCallback, useEffect, useRef } from 'react';

const ORIGINAL_TITLE = document.title;
let unreadCount = 0;
let blinkInterval = null;

function startBlink(text) {
  if (blinkInterval) return;
  let blink = false;
  blinkInterval = setInterval(() => {
    document.title = blink ? text : ORIGINAL_TITLE;
    blink = !blink;
  }, 1000);
}

function stopBlink() {
  if (blinkInterval) { clearInterval(blinkInterval); blinkInterval = null; }
  document.title = ORIGINAL_TITLE;
  unreadCount = 0;
}

export function useNotifications(roomId) {
  const permissionRef = useRef('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => { permissionRef.current = p; });
      }
    }
    // Stop blinking when user returns to tab
    function onFocus() { stopBlink(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const notify = useCallback((title, body, tag) => {
    const isHidden = document.hidden || !document.hasFocus();
    if (!isHidden) return; // user is watching — no notification needed

    // Tab title blink
    unreadCount++;
    startBlink(`(${unreadCount}) ${title}`);

    // Browser notification
    if (permissionRef.current === 'granted') {
      try {
        const n = new Notification(title, {
          body,
          tag: tag || 'psypher',
          icon: '/favicon.svg',
          silent: false,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* some browsers block notifications in certain contexts */ }
    }
  }, []);

  return { notify };
}
