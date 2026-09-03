import { useCallback, useEffect, useRef } from 'react';

export function useNotifications() {
  const permRef      = useRef(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const unreadRef    = useRef(0);
  const blinkRef     = useRef(null);
  const appTitleRef  = useRef('Psypher');

  useEffect(() => {
    // Capture app title after mount
    appTitleRef.current = document.title || 'Psypher';

    function clearUnread() {
      unreadRef.current = 0;
      if (blinkRef.current) { clearInterval(blinkRef.current); blinkRef.current = null; }
      document.title = appTitleRef.current;
    }

    function onVisible() { if (!document.hidden) clearUnread(); }
    function onFocus()   { clearUnread(); }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    if (!document.hidden) clearUnread();

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      clearUnread();
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      permRef.current = await Notification.requestPermission();
    } else {
      permRef.current = Notification.permission;
    }
  }, []);

  const notify = useCallback((title, body, tag) => {
    if (!document.hidden) return; // user is watching — skip

    // Increment and blink tab title
    unreadRef.current += 1;
    if (!blinkRef.current) {
      let blink = true;
      blinkRef.current = setInterval(() => {
        document.title = blink
          ? `(${unreadRef.current}) ${appTitleRef.current}`
          : appTitleRef.current;
        blink = !blink;
      }, 1200);
    }

    // Browser notification
    if (permRef.current === 'granted') {
      try {
        const notif = new Notification(title, {
          body:  body || '',
          tag:   tag  || 'psypher-chat',
          icon:  '/favicon.svg',
          silent: false,
        });
        notif.onclick = () => { window.focus(); notif.close(); };
      } catch { /* ignore — some browsers block programmatic notifications */ }
    }
  }, []);

  return { notify, requestPermission };
}
