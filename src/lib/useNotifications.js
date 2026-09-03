import { useCallback, useEffect, useRef } from 'react';

// Module-level so multiple hook instances share state
let unreadCount  = 0;
let blinkTimer   = null;
let appTitle     = 'Psypher';   // updated after mount

function updateTitle() {
  document.title = unreadCount > 0 ? `(${unreadCount}) ${appTitle}` : appTitle;
}

function increment(senderName) {
  unreadCount++;
  if (!blinkTimer) {
    // Blink: alternate between the unread title and the app title
    let show = true;
    blinkTimer = setInterval(() => {
      document.title = show
        ? `💬 (${unreadCount}) ${appTitle}`
        : appTitle;
      show = !show;
    }, 1200);
  }
  updateTitle();
}

function clearUnread() {
  unreadCount = 0;
  if (blinkTimer) { clearInterval(blinkTimer); blinkTimer = null; }
  document.title = appTitle;
}

export function useNotifications() {
  const permRef = useRef(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  useEffect(() => {
    // Capture the real app title after mount
    appTitle = document.title || 'Psypher';

    // Clear when user comes back to the tab
    function onVisible() {
      if (!document.hidden) clearUnread();
    }
    function onFocus() { clearUnread(); }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    // If already visible, make sure we're clear
    if (!document.hidden) clearUnread();

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Call this once from a user-gesture context (e.g. button click) to request permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      permRef.current = p;
    } else {
      permRef.current = Notification.permission;
    }
  }, []);

  const notify = useCallback((title, body, tag) => {
    // Only notify when the tab is hidden (user is not looking at the chat)
    if (!document.hidden) return;

    // Increment unread + blink title
    increment(title);

    // Browser push notification
    if (permRef.current === 'granted') {
      try {
        const n = new Notification(title, {
          body:  body  || '',
          tag:   tag   || 'psypher-chat',
          icon:  '/favicon.svg',
          badge: '/favicon.svg',
          silent: false,
          requireInteraction: false,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {
        // Safari / some mobile browsers may still block
      }
    }
  }, []);

  return { notify, requestPermission };
}
