import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send, Smile, X, Check, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, CheckSquare, Paperclip, Camera, Image as ImageIcon,
  FileText, File, Mic, Video, FolderOpen,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker.jsx';
import CameraModal from './CameraModal.jsx';
import { domToMarkdown, markdownToHtml, autoFormatEmphasis, startNumberedListIfMatched } from '../lib/richText.jsx';

const MAX_LENGTH  = 1000;
const MAX_FILE_MB = 20;
const MAX_BYTES   = MAX_FILE_MB * 1024 * 1024;

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fileIcon(mime) {
  if (!mime) return File;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Video;
  if (mime.includes('pdf') || mime.includes('text')) return FileText;
  return File;
}

// ── Attachment preview ────────────────────────────────────────────────────────
function AttachmentPreview({ file, onRemove }) {
  const isImage = file.isImage || file.mime?.startsWith('image/');
  const isAudio = file.isAudio || file.mime?.startsWith('audio/');
  const isVideo = file.isVideo || file.mime?.startsWith('video/');
  const Icon = fileIcon(file.mime);

  // For video: dataUrl is already a Blob URL (blobPreview=true) or base64
  const videoSrc = isVideo ? file.dataUrl : null;

  return (
    <div className="mb-2 flex items-center gap-2.5 bg-ink-800 rounded-xl px-3 py-2 border border-ink-600">
      {isImage ? (
        <img src={file.dataUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg shrink-0" />
      ) : isVideo ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 relative">
          <video src={videoSrc} className="w-full h-full object-cover" preload="metadata" muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
              <Video size={10} className="text-white ml-0.5" />
            </div>
          </div>
        </div>
      ) : isAudio ? (
        <div className="w-12 h-12 rounded-lg bg-cipher-700/30 border border-cipher-600/40 flex items-center justify-center shrink-0">
          <Mic size={20} className="text-cipher-400" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-ink-700 border border-ink-600 flex items-center justify-center shrink-0">
          <Icon size={22} className="text-mist-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-mist-200 truncate font-medium">{file.name}</p>
        <p className="text-[11px] text-mist-600">{humanSize(file.size)} · ready to send</p>
      </div>
      <button type="button" onClick={onRemove}
        className="text-mist-500 hover:text-red-400 transition-colors cursor-pointer shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Telegram-style bottom drawer ──────────────────────────────────────────────
function AttachDrawer({ onFile, onCamera, onClose }) {
  const galleryRef = useRef(null);
  const docRef     = useRef(null);

  const options = [
    { label: 'Camera',  icon: Camera,     color: 'bg-red-500',    action: () => { onCamera(); } },
    { label: 'Gallery', icon: ImageIcon,  color: 'bg-violet-500', action: () => { galleryRef.current?.click(); } },
    { label: 'File',    icon: FolderOpen, color: 'bg-blue-500',   action: () => { docRef.current?.click(); } },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-ink-900 border-t border-ink-700 rounded-t-2xl px-6 pt-4 pb-8"
      >
        <div className="w-10 h-1 bg-ink-600 rounded-full mx-auto mb-5" />
        <p className="text-xs text-mist-600 uppercase tracking-widest mb-4">Share</p>
        <div className="grid grid-cols-3 gap-4">
          {options.map(({ label, icon: Icon, color, action }) => (
            <button key={label} type="button"
              onClick={() => { action(); onClose(); }}
              className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-lg group-active:scale-95 transition-transform`}>
                <Icon size={26} className="text-white" />
              </div>
              <span className="text-xs text-mist-400 group-hover:text-mist-200 transition-colors">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
      <input ref={galleryRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />
      <input ref={docRef} type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,audio/*,video/*"
        className="hidden" onChange={onFile} />
    </>
  );
}

// ── Real-time voice waveform from AudioAnalyser ──────────────────────────────
function VoiceWaveform({ seconds, analyserRef }) {
  const BAR_COUNT = 24;
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(4));
  const rafRef = useRef(null);

  useEffect(() => {
    const analyser = analyserRef?.current;
    if (!analyser) return undefined;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const step = () => {
      analyser.getByteFrequencyData(data);
      const chunk = Math.floor(data.length / BAR_COUNT);
      const next = Array.from({ length: BAR_COUNT }, (_, i) => {
        let sum = 0;
        for (let j = 0; j < chunk; j++) sum += data[i * chunk + j];
        const avg = sum / chunk;
        // Map 0-255 → 4-32px
        return Math.max(4, Math.round((avg / 255) * 28 + 4));
      });
      setBars(next);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef]);

  return (
    <div className="flex-1 flex items-center gap-1 px-2">
      <span className="text-xs text-red-400 font-mono w-10 shrink-0">
        {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
      </span>
      <div className="flex items-center gap-[2px] flex-1 h-8">
        {bars.map((h, i) => (
          <div key={i} className="w-[3px] rounded-full bg-red-400 transition-none"
            style={{ height: `${h}px` }} />
        ))}
      </div>
      <motion.div className="w-2 h-2 rounded-full bg-red-500 shrink-0"
        animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MessageInput({
  onSend, onTyping, disabled,
  editingMessage, onSubmitEdit, onCancelEdit,
  replyingTo, onCancelReply,
}) {
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isEmpty,     setIsEmpty]     = useState(true);
  const [selToolbar,  setSelToolbar]  = useState(false);
  const [recording,   setRecording]   = useState(false);
  const [recSecs,     setRecSecs]     = useState(0);
  const [fileLoading, setFileLoading] = useState(false);

  const editorRef       = useRef(null);
  const typingActive    = useRef(false);
  const typingStopTimer = useRef(null);
  const pickerWrapRef   = useRef(null);
  const emojiButtonRef  = useRef(null);
  const mediaRecRef     = useRef(null);
  const recTimerRef     = useRef(null);
  const audioChunksRef  = useRef([]);
  const analyserRef     = useRef(null);
  const audioCtxRef     = useRef(null);

  const isEditing  = !!editingMessage;
  const hasContent = !isEmpty || !!pendingFile;

  // Close emoji on outside click
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const fn = (e) => {
      if (pickerWrapRef.current?.contains(e.target)) return;
      if (emojiButtonRef.current?.contains(e.target)) return;
      setPickerOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [pickerOpen]);

  // Selection toolbar
  useEffect(() => {
    const fn = () => {
      const sel = window.getSelection();
      const el  = editorRef.current;
      if (!sel || !el || sel.rangeCount === 0 || sel.isCollapsed) { setSelToolbar(false); return; }
      setSelToolbar(el.contains(sel.anchorNode) && el.contains(sel.focusNode));
    };
    document.addEventListener('selectionchange', fn);
    return () => document.removeEventListener('selectionchange', fn);
  }, []);

  // Hydrate editor when editing
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(editingMessage.text);
      setIsEmpty(!editingMessage.text?.trim());
      focusEnd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  const focusEnd = () => {
    const el = editorRef.current; if (!el) return;
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
  };
  const refreshEmpty = () => setIsEmpty((editorRef.current?.textContent || '').trim().length === 0);
  const clearEditor  = () => { if (editorRef.current) editorRef.current.innerHTML = ''; setIsEmpty(true); };

  const handleInput = () => {
    if (!typingActive.current) { typingActive.current = true; onTyping(true); }
    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => { typingActive.current = false; onTyping(false); }, 1500);
    autoFormatEmphasis();
    if (editorRef.current) startNumberedListIfMatched(editorRef.current);
    refreshEmpty();
  };

  const handleBeforeInput = (e) => {
    if (disabled) { e.preventDefault(); return; }
    const len = editorRef.current?.textContent.length || 0;
    const ins = typeof e.data === 'string' ? e.data : '';
    if (e.inputType?.startsWith('insert') && ins && len + ins.length > MAX_LENGTH) e.preventDefault();
  };

  const isCaretInList = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && (node.tagName === 'LI' || node.tagName === 'OL')) return true;
      node = node.parentNode;
    }
    return false;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isCaretInList()) { e.preventDefault(); submit(); }
    if (e.key === 'Escape' && isEditing) { onCancelEdit(); clearEditor(); }
  };

  const getRange = () => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (sel?.rangeCount > 0 && el.contains(sel.anchorNode)) return sel.getRangeAt(0);
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); return r;
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);

    // Check for any file (image, video, audio, pdf, etc.)
    const fileItem = items.find(it => it.kind === 'file');
    if (fileItem) {
      e.preventDefault();
      const f = fileItem.getAsFile();
      if (f) loadFile(f);
      return;
    }

    // Plain text paste
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const el = editorRef.current; if (!el) return;
    el.focus();
    const range = getRange(); range.deleteContents();
    const frag = document.createDocumentFragment();
    text.split('\n').forEach((p, i, arr) => {
      frag.appendChild(document.createTextNode(p));
      if (i < arr.length - 1) frag.appendChild(document.createElement('br'));
    });
    const last = frag.lastChild;
    range.insertNode(frag);
    if (last) {
      const r = document.createRange(); r.setStartAfter(last); r.collapse(true);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    }
    refreshEmpty();
  };

  const insertEmoji = (val) => {
    if (val.startsWith('[gif]')) {
      const reply = replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null;
      onSend(val, reply);
      onCancelReply?.();
      setPickerOpen(false);
      return;
    }
    const el = editorRef.current; if (!el) return;
    el.focus();
    const range = getRange(); range.deleteContents();
    const node = document.createTextNode(val);
    range.insertNode(node);
    const r = document.createRange(); r.setStartAfter(node); r.collapse(true);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    refreshEmpty();
  };

  const loadFile = (file) => {
    if (!file) return;
    const isVideo = (file.type || '').startsWith('video/');

    // For video: enforce a tighter limit (50MB raw = ~67MB base64 — too large for socket)
    const videoLimit = 50 * 1024 * 1024;
    const limit = isVideo ? videoLimit : MAX_BYTES;
    if (file.size > limit) {
      alert(`File too large. Max ${isVideo ? '50' : MAX_FILE_MB} MB.`);
      return;
    }

    setFileLoading(true);

    if (isVideo) {
      // For video: use Blob URL for preview; read as base64 for sending
      const previewUrl = URL.createObjectURL(file);
      // Show preview immediately
      setPendingFile({
        name: file.name, mime: file.type,
        size: file.size, dataUrl: previewUrl,
        blobPreview: true, // flag: this is a Blob URL, not base64 yet
        rawFile: file,     // keep raw file for sending
        isImage: false, isAudio: false, isVideo: true,
      });
      setFileLoading(false);
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        setPendingFile({
          name: file.name, mime: file.type || 'application/octet-stream',
          size: file.size, dataUrl: ev.target.result,
          isImage: (file.type || '').startsWith('image/'),
          isAudio: (file.type || '').startsWith('audio/'),
          isVideo: false,
        });
        setFileLoading(false);
      };
      reader.onerror = () => { alert('Could not read file.'); setFileLoading(false); };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; };

  const handleCameraCapture = (dataUrl) => {
    const approxBytes = Math.round((dataUrl.length * 3) / 4);
    if (approxBytes > MAX_BYTES) { alert(`Image too large. Max ${MAX_FILE_MB} MB.`); return; }
    setPendingFile({ name: 'Photo.jpg', mime: 'image/jpeg', size: approxBytes, dataUrl, isImage: true, isAudio: false });
    setCameraOpen(false);
  };

  const applyFormat = (cmd) => { editorRef.current?.focus(); document.execCommand(cmd); };
  const selectAll   = () => {
    const el = editorRef.current; if (!el) return; el.focus();
    const r = document.createRange(); r.selectNodeContents(el);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
  };

  // ── Voice recording ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { alert('Microphone not supported.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up AudioContext + AnalyserNode for real-time waveform
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current  = ctx;
      analyserRef.current  = analyser;

      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        analyserRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size > MAX_BYTES) { alert(`Voice note too large (max ${MAX_FILE_MB} MB).`); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setPendingFile({
          name: 'Voice note.webm', mime: 'audio/webm', size: blob.size,
          dataUrl: ev.target.result, isImage: false, isAudio: true,
        });
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch { alert('Could not access microphone.'); }
  };

  const stopRecording = () => {
    clearInterval(recTimerRef.current);
    mediaRecRef.current?.stop();
    setRecording(false); setRecSecs(0);
  };

  const cancelRecording = () => {
    clearInterval(recTimerRef.current);
    mediaRecRef.current?.stream?.getTracks().forEach(t => t.stop());
    try { mediaRecRef.current?.stop(); } catch { /**/ }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
    setRecording(false); setRecSecs(0);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const submit = () => {
    if (recording) { stopRecording(); return; }
    const reply = replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null;
    if (pendingFile) {
      const doSend = (dataUrl) => {
        const msg = pendingFile.isImage
          ? `[image]${dataUrl}`
          : `[file]${pendingFile.mime}|${pendingFile.name}|${dataUrl}`;
        onSend(msg, reply);
        setPendingFile(null); onCancelReply?.(); clearEditor();
        setFileLoading(false);
      };

      if (pendingFile.blobPreview && pendingFile.rawFile) {
        // Video: need to convert raw File to base64 now
        setFileLoading(true);
        const reader = new FileReader();
        reader.onload = ev => doSend(ev.target.result);
        reader.onerror = () => { alert('Failed to read video.'); setFileLoading(false); };
        reader.readAsDataURL(pendingFile.rawFile);
        return;
      }

      doSend(pendingFile.dataUrl);
      return;
    }
    const markdown = editorRef.current ? domToMarkdown(editorRef.current).trim() : '';
    if (!markdown) return;
    if (isEditing) { onSubmitEdit(editingMessage.id, markdown); }
    else { onSend(markdown, reply); onCancelReply?.(); }
    clearEditor();
    typingActive.current = false;
    onTyping(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative bg-ink-900 border-t border-ink-700">

      {/* Editing banner */}
      {isEditing && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-ink-700">
          <span className="flex items-center gap-1.5 text-xs text-cipher-400"><Check size={12} /> Editing message</span>
          <button type="button" onClick={() => { onCancelEdit(); clearEditor(); }} className="text-mist-500 hover:text-mist-100 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Reply banner */}
      {replyingTo && !isEditing && (
        <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-1.5 rounded-xl bg-signal-700/10 border-l-2 border-signal-500/60">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-signal-400">{replyingTo.senderName}</p>
            <p className="text-xs text-mist-500 truncate">
              {replyingTo.text?.startsWith('[image]') ? '📷 Image'
                : replyingTo.text?.startsWith('[file]') ? '📎 File'
                : replyingTo.text?.startsWith('[gif]') ? '🎞️ GIF'
                : replyingTo.text}
            </p>
          </div>
          <button type="button" onClick={onCancelReply} className="text-mist-600 hover:text-mist-300 cursor-pointer shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Loading indicator when reading file */}
      {fileLoading && (
        <div className="px-4 pt-2 flex items-center gap-2 text-xs text-mist-500">
          <div className="w-3 h-3 border border-mist-600 border-t-mist-300 rounded-full animate-spin" />
          Reading file…
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && !recording && !fileLoading && (
        <div className="px-3 pt-2">
          <AttachmentPreview file={pendingFile} onRemove={() => { setPendingFile(null); }} />
        </div>
      )}

      {/* Emoji picker */}
      <AnimatePresence>
        {pickerOpen && (
          <div ref={pickerWrapRef} className="absolute bottom-full mb-1 left-3 z-30">
            <EmojiPicker onPick={(em) => { insertEmoji(em); if (!em.startsWith('[gif]')) setPickerOpen(false); }} />
          </div>
        )}
      </AnimatePresence>

      {/* Selection formatting toolbar */}
      <AnimatePresence>
        {selToolbar && !pendingFile && !recording && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-xl border border-ink-600 bg-ink-800 p-1 shadow-xl"
          >
            {[
              { cmd: 'bold', icon: Bold }, { cmd: 'italic', icon: Italic },
              { cmd: 'underline', icon: UnderlineIcon }, { cmd: 'strikeThrough', icon: Strikethrough },
            ].map(({ cmd, icon: Icon }) => (
              <button key={cmd} type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat(cmd)}
                className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
                <Icon size={14} />
              </button>
            ))}
            <div className="w-px h-4 bg-ink-700 mx-0.5" />
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectAll}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
              <CheckSquare size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WhatsApp-style input row ─────────────────────────────────────────── */}
      <div className="flex items-end gap-2 px-2 py-2">

        {/* Emoji button (left) */}
        <button type="button" ref={emojiButtonRef} onClick={() => setPickerOpen(v => !v)} disabled={disabled || recording}
          className={`shrink-0 p-2 rounded-full transition-colors cursor-pointer disabled:opacity-30 ${pickerOpen ? 'text-signal-400' : 'text-mist-400 hover:text-signal-400'}`}>
          <Smile size={22} />
        </button>

        {/* Text editor or voice waveform */}
        <div className="flex-1 min-w-0">
          {recording ? (
            <div className="flex items-center gap-1 bg-ink-800 border border-red-500/40 rounded-full px-3 py-2.5 min-h-[2.75rem]">
              <button type="button" onClick={cancelRecording} className="text-mist-500 hover:text-red-400 cursor-pointer shrink-0">
                <X size={16} />
              </button>
              <VoiceWaveform seconds={recSecs} analyserRef={analyserRef} />
            </div>
          ) : (
            <div className="relative">
              {isEmpty && !pendingFile && (
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mist-600 truncate max-w-[calc(100%-2rem)] z-10">
                  {disabled ? 'Reconnecting…' : isEditing ? 'Edit message…' : 'Message…'}
                </span>
              )}
              <div
                ref={editorRef}
                contentEditable={!disabled && !pendingFile}
                suppressContentEditableWarning
                onInput={handleInput}
                onBeforeInput={handleBeforeInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                data-chat-input
                role="textbox"
                aria-multiline="true"
                className={`w-full rounded-full bg-ink-800 border px-4 py-2.5 text-sm text-mist-100 outline-none max-h-28 overflow-y-auto transition-colors
                  ${disabled || pendingFile ? 'opacity-50' : ''}
                  ${isEditing ? 'border-cipher-500 rounded-xl' : 'border-ink-600 focus:border-signal-500/60'}`}
                style={{ minHeight: '2.75rem' }}
              />
            </div>
          )}
        </div>

        {/* Right buttons */}
        {hasContent || recording ? (
          /* Send / Stop */
          <motion.button type="button" onClick={submit} disabled={!hasContent && !recording}
            whileTap={{ scale: 0.9 }}
            className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg
              ${recording ? 'bg-red-500 hover:bg-red-400' : isEditing ? 'bg-cipher-500 hover:bg-cipher-400' : 'bg-signal-500 hover:bg-signal-400'}`}>
            {recording ? <Check size={20} className="text-white" /> : <Send size={20} className="text-white" />}
          </motion.button>
        ) : (
          /* Attach + Mic */
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setDrawerOpen(true)} disabled={disabled}
              className="p-2 rounded-full text-mist-400 hover:text-signal-400 transition-colors cursor-pointer disabled:opacity-30">
              <Paperclip size={22} />
            </button>
            <motion.button type="button" onClick={startRecording} disabled={disabled}
              whileTap={{ scale: 0.9 }}
              className="w-11 h-11 rounded-full bg-signal-500 hover:bg-signal-400 flex items-center justify-center cursor-pointer shadow-lg disabled:opacity-30">
              <Mic size={20} className="text-white" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Attach drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <AttachDrawer
            onFile={handleFileInput}
            onCamera={() => { setDrawerOpen(false); setCameraOpen(true); }}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Camera modal */}
      <AnimatePresence>
        {cameraOpen && (
          <CameraModal
            onCapture={handleCameraCapture}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
