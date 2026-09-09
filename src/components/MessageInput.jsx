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

// ── Attachment preview strip ─────────────────────────────────────────────────
function AttachmentPreview({ file, onRemove }) {
  const isImg   = file.isImage || file.mime?.startsWith('image/');
  const isAudio = file.isAudio || file.mime?.startsWith('audio/');
  const isVid   = file.isVideo || file.mime?.startsWith('video/');
  const Icon    = fileIcon(file.mime);
  return (
    <div className="mx-2 mb-1 flex items-center gap-2.5 bg-ink-800 rounded-xl px-3 py-2 border border-ink-700">
      {isImg ? (
        <img src={file.dataUrl} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
      ) : isVid ? (
        <div className="w-10 h-10 rounded-lg bg-black overflow-hidden shrink-0 relative">
          <video src={file.dataUrl} className="w-full h-full object-cover" preload="metadata" muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Video size={12} className="text-white" />
          </div>
        </div>
      ) : isAudio ? (
        <div className="w-10 h-10 rounded-lg bg-cipher-800/40 flex items-center justify-center shrink-0">
          <Mic size={16} className="text-cipher-400" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg bg-ink-700 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-mist-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-mist-200 truncate font-medium">{file.name}</p>
        <p className="text-[10px] text-mist-600">{humanSize(file.size)}</p>
      </div>
      <button type="button" onClick={onRemove} className="text-mist-600 hover:text-red-400 cursor-pointer shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Telegram attach drawer ───────────────────────────────────────────────────
function AttachDrawer({ onFile, onCamera, onClose }) {
  const galleryRef = useRef(null);
  const docRef     = useRef(null);
  const options = [
    { label: 'Camera',  icon: Camera,     color: 'bg-red-500',    fn: () => { onCamera(); onClose(); } },
    { label: 'Gallery', icon: ImageIcon,  color: 'bg-violet-500', fn: () => { galleryRef.current?.click(); onClose(); } },
    { label: 'File',    icon: FolderOpen, color: 'bg-blue-500',   fn: () => { docRef.current?.click(); onClose(); } },
  ];
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-ink-900 border-t border-ink-700 rounded-t-2xl px-6 pt-3 pb-8">
        <div className="w-10 h-1 bg-ink-600 rounded-full mx-auto mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {options.map(({ label, icon: Icon, color, fn }) => (
            <button key={label} type="button" onClick={fn}
              className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-lg group-active:scale-90 transition-transform`}>
                <Icon size={24} className="text-white" />
              </div>
              <span className="text-xs text-mist-400 group-hover:text-mist-200">{label}</span>
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

// ── Voice recording bar ──────────────────────────────────────────────────────
function RecordingBar({ seconds, analyserRef, onCancel }) {
  const BAR_COUNT = 28;
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(6));
  const rafRef = useRef(null);

  useEffect(() => {
    const analyser = analyserRef?.current;
    if (!analyser) return undefined;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const chunk = Math.floor(data.length / BAR_COUNT);
      const next = Array.from({ length: BAR_COUNT }, (_, i) => {
        let sum = 0;
        for (let j = 0; j < chunk; j++) sum += data[i * chunk + j];
        return Math.max(4, Math.round((sum / chunk / 255) * 26 + 4));
      });
      setBars(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef]);

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 bg-ink-800 border border-red-500/30 rounded-full px-3 h-11">
      <button type="button" onClick={onCancel} className="shrink-0 text-mist-500 hover:text-red-400 cursor-pointer">
        <X size={16} />
      </button>
      <span className="text-xs text-red-400 font-mono shrink-0 w-9">
        {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
      </span>
      <div className="flex items-center gap-[2px] flex-1 h-6">
        {bars.map((h, i) => (
          <div key={i} className="w-[2.5px] rounded-full bg-red-400" style={{ height: `${h}px` }} />
        ))}
      </div>
      <motion.div className="w-2 h-2 rounded-full bg-red-500 shrink-0"
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
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
  const [recording,   setRecording]   = useState(false);  // mic-tap mode
  const [recSecs,     setRecSecs]     = useState(0);
  const [fileLoading, setFileLoading] = useState(false);
  const [micHeld,     setMicHeld]     = useState(false);  // press-hold state

  const editorRef       = useRef(null);
  const typingActive    = useRef(false);
  const typingStopTimer = useRef(null);
  const pickerWrapRef   = useRef(null);
  const mediaRecRef     = useRef(null);
  const recTimerRef     = useRef(null);
  const audioChunksRef  = useRef([]);
  const analyserRef     = useRef(null);
  const audioCtxRef     = useRef(null);
  const holdTimeout     = useRef(null);
  const isHoldRef       = useRef(false);  // true = press-hold mode, false = tap mode

  const isEditing  = !!editingMessage;
  const hasContent = !isEmpty || !!pendingFile;

  // Close emoji on outside click / tap
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const fn = (e) => {
      if (pickerWrapRef.current?.contains(e.target)) return;
      setPickerOpen(false);
    };
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn, { passive: true });
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('touchstart', fn);
    };
  }, [pickerOpen]);

  // Selection toolbar
  useEffect(() => {
    const fn = () => {
      const sel = window.getSelection(); const el = editorRef.current;
      if (!sel || !el || sel.rangeCount === 0 || sel.isCollapsed) { setSelToolbar(false); return; }
      setSelToolbar(el.contains(sel.anchorNode) && el.contains(sel.focusNode));
    };
    document.addEventListener('selectionchange', fn);
    return () => document.removeEventListener('selectionchange', fn);
  }, []);

  // Hydrate editor for editing
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
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return false;
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
    const el = editorRef.current; const sel = window.getSelection();
    if (sel?.rangeCount > 0 && el.contains(sel.anchorNode)) return sel.getRangeAt(0);
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); return r;
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const fileItem = items.find(it => it.kind === 'file');
    if (fileItem) { e.preventDefault(); const f = fileItem.getAsFile(); if (f) loadFile(f); return; }
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
    const last = frag.lastChild; range.insertNode(frag);
    if (last) {
      const r = document.createRange(); r.setStartAfter(last); r.collapse(true);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    }
    refreshEmpty();
  };

  const insertEmoji = (val) => {
    if (val.startsWith('[gif]')) {
      const reply = replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null;
      onSend(val, reply); onCancelReply?.(); setPickerOpen(false); return;
    }
    const el = editorRef.current; if (!el) return;
    el.focus();
    const range = getRange(); range.deleteContents();
    const node = document.createTextNode(val); range.insertNode(node);
    const r = document.createRange(); r.setStartAfter(node); r.collapse(true);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
    refreshEmpty();
  };

  const loadFile = (file) => {
    if (!file) return;
    const isVid = (file.type || '').startsWith('video/');
    const limit = isVid ? 50 * 1024 * 1024 : MAX_BYTES;
    if (file.size > limit) { alert(`Max ${isVid ? '50' : MAX_FILE_MB} MB`); return; }
    setFileLoading(true);
    if (isVid) {
      setPendingFile({
        name: file.name, mime: file.type, size: file.size,
        dataUrl: URL.createObjectURL(file), blobPreview: true, rawFile: file,
        isImage: false, isAudio: false, isVideo: true,
      });
      setFileLoading(false);
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        setPendingFile({
          name: file.name, mime: file.type || 'application/octet-stream', size: file.size,
          dataUrl: ev.target.result,
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
    const bytes = Math.round((dataUrl.length * 3) / 4);
    if (bytes > MAX_BYTES) { alert(`Max ${MAX_FILE_MB} MB`); return; }
    setPendingFile({ name: 'Photo.jpg', mime: 'image/jpeg', size: bytes, dataUrl, isImage: true, isAudio: false });
    setCameraOpen(false);
  };

  const applyFormat = (cmd) => { editorRef.current?.focus(); document.execCommand(cmd); };
  const selectAll   = () => {
    const el = editorRef.current; if (!el) return; el.focus();
    const r = document.createRange(); r.selectNodeContents(el);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(r);
  };

  // ── Recording engine ─────────────────────────────────────────────────────────
  const startMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { alert('Microphone not supported.'); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.65;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx; analyserRef.current = analyser;
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      mediaRecRef.current = mr;
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
      return true;
    } catch { alert('Cannot access microphone.'); return false; }
  };

  const stopMicAndSend = () => {
    clearInterval(recTimerRef.current);
    const mr = mediaRecRef.current;
    if (!mr) return;
    mr.onstop = () => {
      mr.stream?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close(); audioCtxRef.current = null; analyserRef.current = null;
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (blob.size < 1000) return; // too short, ignore
      const reader = new FileReader();
      reader.onload = ev => {
        const reply = replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null;
        onSend(`[file]audio/webm|Voice note.webm|${ev.target.result}`, reply);
        onCancelReply?.();
      };
      reader.readAsDataURL(blob);
    };
    mr.stop();
    setRecording(false); setMicHeld(false); setRecSecs(0);
  };

  const cancelMic = () => {
    clearInterval(recTimerRef.current);
    try { mediaRecRef.current?.stream?.getTracks().forEach(t => t.stop()); } catch { /**/ }
    try { mediaRecRef.current?.stop(); } catch { /**/ }
    audioCtxRef.current?.close(); audioCtxRef.current = null; analyserRef.current = null;
    audioChunksRef.current = [];
    setRecording(false); setMicHeld(false); setRecSecs(0);
  };

  // ── Mic button: press-hold = record → release = send; tap = toggle record mode
  const onMicPointerDown = (e) => {
    e.preventDefault();
    isHoldRef.current = false;
    holdTimeout.current = setTimeout(async () => {
      isHoldRef.current = true;
      const ok = await startMic();
      if (ok) setMicHeld(true);
    }, 200); // 200ms to distinguish tap from hold
  };

  const onMicPointerUp = () => {
    clearTimeout(holdTimeout.current);
    if (isHoldRef.current && micHeld) {
      // Was holding — release = send
      stopMicAndSend();
    } else if (!isHoldRef.current) {
      // Was a tap — toggle recording mode
      if (recording) {
        stopMicAndSend();
      } else {
        startMic().then(ok => { if (ok) setRecording(true); });
      }
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = () => {
    if (recording) { stopMicAndSend(); return; }
    const reply = replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null;
    if (pendingFile) {
      const doSend = (dataUrl) => {
        const msg = pendingFile.isImage ? `[image]${dataUrl}` : `[file]${pendingFile.mime}|${pendingFile.name}|${dataUrl}`;
        onSend(msg, reply); setPendingFile(null); onCancelReply?.(); clearEditor(); setFileLoading(false);
      };
      if (pendingFile.blobPreview && pendingFile.rawFile) {
        setFileLoading(true);
        const reader = new FileReader();
        reader.onload = ev => doSend(ev.target.result);
        reader.onerror = () => { alert('Failed to read file.'); setFileLoading(false); };
        reader.readAsDataURL(pendingFile.rawFile);
        return;
      }
      doSend(pendingFile.dataUrl); return;
    }
    const markdown = editorRef.current ? domToMarkdown(editorRef.current).trim() : '';
    if (!markdown) return;
    if (isEditing) { onSubmitEdit(editingMessage.id, markdown); }
    else { onSend(markdown, reply); onCancelReply?.(); }
    clearEditor(); typingActive.current = false; onTyping(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative bg-ink-900 border-t border-ink-700">

      {/* Editing banner */}
      {isEditing && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-ink-700">
          <span className="flex items-center gap-1.5 text-xs text-cipher-400"><Check size={12} /> Editing</span>
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

      {/* File loading */}
      {fileLoading && (
        <div className="px-4 pt-2 flex items-center gap-2 text-xs text-mist-500">
          <div className="w-3 h-3 border border-mist-600 border-t-mist-300 rounded-full animate-spin" />
          Reading file…
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && !recording && !fileLoading && (
        <div className="pt-2">
          <AttachmentPreview file={pendingFile} onRemove={() => setPendingFile(null)} />
        </div>
      )}

      {/* Selection formatting toolbar */}
      <AnimatePresence>
        {selToolbar && !pendingFile && !recording && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-xl border border-ink-600 bg-ink-800 p-1 shadow-xl">
            {[{ cmd: 'bold', icon: Bold }, { cmd: 'italic', icon: Italic },
              { cmd: 'underline', icon: UnderlineIcon }, { cmd: 'strikeThrough', icon: Strikethrough }]
              .map(({ cmd, icon: Icon }) => (
                <button key={cmd} type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat(cmd)}
                  className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 cursor-pointer">
                  <Icon size={14} />
                </button>
              ))}
            <div className="w-px h-4 bg-ink-700 mx-0.5" />
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectAll}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 cursor-pointer">
              <CheckSquare size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WhatsApp input row ─────────────────────────────────────────────── */}
      <div className="flex items-end gap-2 px-2 py-2">

        {/* Left green mic button (only shows when not recording and no content) */}
        {/* Main input pill */}
        <div className="flex-1 flex items-end gap-0 min-w-0 bg-ink-800 border border-ink-700 rounded-[24px] px-1 py-1">

          {/* Emoji button — inside the pill */}
          <button type="button"
            onClick={() => setPickerOpen(v => !v)}
            disabled={disabled || recording}
            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer disabled:opacity-30 ${pickerOpen ? 'text-signal-400' : 'text-mist-500 hover:text-mist-200'}`}>
            <Smile size={21} />
          </button>

          {/* Text / recording area */}
          <div className="flex-1 min-w-0 py-0.5">
            {recording || micHeld ? (
              <RecordingBar seconds={recSecs} analyserRef={analyserRef} onCancel={cancelMic} />
            ) : (
              <div className="relative">
                {isEmpty && !pendingFile && (
                  <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-sm text-mist-600 truncate z-10">
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
                  className={`w-full px-1 py-2 text-sm text-mist-100 outline-none max-h-28 overflow-y-auto bg-transparent ${disabled || pendingFile ? 'opacity-50' : ''}`}
                  style={{ minHeight: '2.25rem' }}
                />
              </div>
            )}
          </div>

          {/* Attach + Camera — inside pill, right side, only when no content */}
          {!hasContent && !recording && !micHeld && (
            <div className="flex items-center shrink-0">
              <button type="button" onClick={() => setDrawerOpen(true)} disabled={disabled}
                className="w-9 h-9 flex items-center justify-center rounded-full text-mist-500 hover:text-mist-200 cursor-pointer disabled:opacity-30">
                <Paperclip size={20} />
              </button>
              <button type="button" onClick={() => setCameraOpen(true)} disabled={disabled}
                className="w-9 h-9 flex items-center justify-center rounded-full text-mist-500 hover:text-mist-200 cursor-pointer disabled:opacity-30">
                <Camera size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Right round button — Send or Mic */}
        <AnimatePresence mode="wait">
          {hasContent || recording || micHeld ? (
            <motion.button key="send" type="button" onClick={submit}
              initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors ${
                recording || micHeld ? 'bg-red-500 hover:bg-red-400' : isEditing ? 'bg-cipher-500 hover:bg-cipher-400' : 'bg-signal-500 hover:bg-signal-400'
              }`}>
              {recording || micHeld
                ? <Check size={20} className="text-white" />
                : isEditing
                ? <Check size={20} className="text-white" />
                : <Send size={18} className="text-white" />}
            </motion.button>
          ) : (
            <motion.button key="mic" type="button"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onPointerDown={onMicPointerDown}
              onPointerUp={onMicPointerUp}
              onPointerLeave={onMicPointerUp}
              onPointerCancel={onMicPointerUp}
              disabled={disabled}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all select-none touch-none disabled:opacity-30 ${
                micHeld ? 'bg-red-500 scale-110' : 'bg-signal-500 hover:bg-signal-400'
              }`}
              style={{ WebkitUserSelect: 'none' }}>
              <Mic size={20} className="text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Emoji / GIF bottom sheet — backdrop closes it */}
      <AnimatePresence>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} />
            <div ref={pickerWrapRef} className="relative z-40">
              <EmojiPicker
                onPick={(val) => { insertEmoji(val); if (!val.startsWith('[gif]')) setPickerOpen(false); }}
                onClose={() => setPickerOpen(false)}
              />
            </div>
          </>
        )}
      </AnimatePresence>

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
        {cameraOpen && <CameraModal onCapture={handleCameraCapture} onClose={() => setCameraOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
