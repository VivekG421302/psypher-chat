import { motion } from 'framer-motion';
import { X, Send, RotateCcw, Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPreview({ file, caption, onChangeCaption, onSend, onCancel }) {
  const isImage = file.isImage || file.mime?.startsWith('image/');
  const isVideo = file.isVideo || file.mime?.startsWith('video/');
  const isAudio = file.isAudio || file.mime?.startsWith('audio/');
  const isFile  = !isImage && !isVideo && !isAudio;
  const inputRef = useRef(null);

  // Blob URL for video
  const [videoSrc, setVideoSrc] = useState(null);
  useEffect(() => {
    if (!isVideo) return;
    setVideoSrc(file.dataUrl); // already a Blob URL from loadFile
  }, [isVideo, file.dataUrl]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 shrink-0">
        <button onClick={onCancel} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors">
          <X size={18} />
        </button>
        <p className="text-white text-sm font-medium truncate mx-4 flex-1 text-center">{file.name}</p>
        <div className="w-9" />
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        {isImage && (
          <img src={file.dataUrl} alt={file.name}
            className="max-w-full max-h-full object-contain rounded-xl" />
        )}
        {isVideo && videoSrc && (
          <video src={videoSrc} controls autoPlay={false} playsInline
            className="max-w-full max-h-full rounded-xl bg-black" />
        )}
        {isAudio && (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-24 h-24 rounded-full bg-cipher-700/40 border border-cipher-600/40 flex items-center justify-center">
              <Mic size={40} className="text-cipher-400" />
            </div>
            <p className="text-mist-300 text-sm">{file.name}</p>
            <audio controls src={file.dataUrl} className="w-64" preload="metadata" style={{ colorScheme: 'dark' }} />
          </div>
        )}
        {isFile && (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-24 h-24 rounded-2xl bg-blue-700/40 border border-blue-600/40 flex items-center justify-center">
              <span className="text-3xl">📄</span>
            </div>
            <p className="text-mist-100 font-medium">{file.name}</p>
            <p className="text-mist-500 text-sm">{humanSize(file.size)}</p>
          </div>
        )}
      </div>

      {/* Caption + Send */}
      <div className="shrink-0 px-4 pb-safe pb-4 pt-3">
        <div className="flex items-center gap-3 bg-ink-800/80 backdrop-blur rounded-full px-4 py-2.5 border border-ink-700">
          <input
            ref={inputRef}
            value={caption}
            onChange={e => onChangeCaption(e.target.value)}
            placeholder="Add a caption…"
            className="flex-1 bg-transparent text-sm text-mist-100 placeholder:text-mist-600 outline-none min-w-0"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          />
          <motion.button
            type="button" onClick={onSend}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-signal-500 hover:bg-signal-400 flex items-center justify-center shrink-0 cursor-pointer shadow-lg transition-colors">
            <Send size={16} className="text-white" />
          </motion.button>
        </div>
        <p className="text-center text-mist-700 text-[10px] mt-2">{humanSize(file.size)}</p>
      </div>
    </motion.div>
  );
}
