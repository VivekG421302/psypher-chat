import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({ notify: () => {} });

const ICONS   = { success: CheckCircle2, error: XCircle, info: Info };
const ACCENTS = {
  success: 'text-cipher-500 border-cipher-700/40',
  error:   'text-danger border-danger/40',
  info:    'text-signal-500 border-signal-700/40',
};

// Threshold in px — drag past this to dismiss
const DISMISS_THRESHOLD = 80;

function Toast({ toast, onDismiss }) {
  const x       = useMotionValue(0);
  const opacity = useTransform(x, [-DISMISS_THRESHOLD * 1.5, 0, DISMISS_THRESHOLD * 1.5], [0, 1, 0]);
  const Icon    = ICONS[toast.type] || Info;

  function handleDragEnd(_, info) {
    if (Math.abs(info.offset.x) > DISMISS_THRESHOLD) {
      onDismiss(toast.id);
    }
  }

  return (
    <motion.div
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      style={{ x, opacity }}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.18 } }}
      transition={{ duration: 0.18 }}
      className={`flex items-start gap-2.5 rounded-xl border bg-ink-800/95 backdrop-blur px-3.5 py-3 shadow-lg cursor-grab active:cursor-grabbing select-none ${ACCENTS[toast.type] || ACCENTS.info}`}
      role="status"
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="text-sm text-mist-100 leading-snug flex-1">{toast.message}</p>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onDismiss(toast.id)}
        className="text-mist-500 hover:text-mist-100 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (message, type = 'info', duration = 3200) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
