import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, RefreshCw } from 'lucide-react';

/**
 * Webcam capture modal — works on both desktop and mobile.
 * On mobile, falls back to the native camera via file input if getUserMedia fails.
 */
export default function CameraModal({ onCapture, onClose }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const fallbackRef = useRef(null);

  const [ready,     setReady]     = useState(false);
  const [error,     setError]     = useState(null);
  const [facingBack, setFacingBack] = useState(true);
  const [flash,     setFlash]     = useState(false);

  const startCamera = async (back) => {
    // Stop any existing stream
    streamRef.current?.getTracks().forEach(t => t.stop());
    setReady(false);
    setError(null);
    try {
      const constraints = {
        video: {
          facingMode: back ? 'environment' : 'user',
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      // getUserMedia not available or denied — show fallback file input
      setError('camera_unavailable');
    }
  };

  useEffect(() => {
    startCamera(true);
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipCamera = () => {
    const next = !facingBack;
    setFacingBack(next);
    startCamera(next);
  };

  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCapture(dataUrl);
  };

  const handleFallback = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCapture(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        className="fixed inset-4 md:inset-12 lg:inset-20 z-50 bg-black rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/60 absolute top-0 left-0 right-0 z-10">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white cursor-pointer hover:bg-black/60">
            <X size={18} />
          </button>
          <span className="text-white text-sm font-medium">Camera</span>
          <button onClick={flipCamera} disabled={!!error}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white cursor-pointer hover:bg-black/60 disabled:opacity-40">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Viewfinder */}
        {error === 'camera_unavailable' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white px-8 text-center">
            <Camera size={48} className="text-mist-500" />
            <p className="text-sm text-mist-300">Camera not available.<br />Use your device's file picker instead.</p>
            <button
              onClick={() => fallbackRef.current?.click()}
              className="bg-signal-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer hover:bg-signal-400">
              Choose Photo
            </button>
            <input ref={fallbackRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleFallback} />
          </div>
        ) : (
          <div className="flex-1 relative bg-black overflow-hidden">
            {/* Flash overlay */}
            <AnimatePresence>
              {flash && (
                <motion.div
                  initial={{ opacity: 0.8 }} animate={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-white z-10 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingBack ? 'none' : 'scaleX(-1)' }}
            />

            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Viewfinder corners */}
            {ready && (
              <div className="absolute inset-8 pointer-events-none">
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-8 h-8`}>
                    <div className={`absolute ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'} w-full h-0.5 bg-white/60 rounded-full`} />
                    <div className={`absolute ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'} h-full w-0.5 bg-white/60 rounded-full`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shutter button */}
        {!error && (
          <div className="shrink-0 py-6 flex items-center justify-center bg-black/60">
            <button
              onClick={capture}
              disabled={!ready}
              className="w-18 h-18 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 active:scale-90 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center"
              style={{ width: '72px', height: '72px' }}
              aria-label="Take photo"
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </>
  );
}
