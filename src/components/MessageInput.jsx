import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send, Smile, X, Check, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, CheckSquare, Paperclip, Camera, Image as ImageIcon,
  FileText, File, Mic, Square,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker.jsx';
import { domToMarkdown, markdownToHtml, autoFormatEmphasis, startNumberedListIfMatched } from '../lib/richText.jsx';

const MAX_LENGTH  = 1000;
const MAX_FILE_MB = 5;
const MAX_BYTES   = MAX_FILE_MB * 1024 * 1024;

function fileIcon(mime) {
  if (!mime) return File;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime === 'application/pdf' || mime.includes('text')) return FileText;
  return File;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Pending attachment preview card
function AttachmentPreview({ file, onRemove }) {
  const isImage = file.mime?.startsWith('image/');
  const Icon = fileIcon(file.mime);
  return (
    <div className="mb-2 flex items-center gap-2.5 bg-ink-800 rounded-xl px-3 py-2 border border-ink-600">
      {isImage ? (
        <img src={file.dataUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg shrink-0" />
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
        className="text-mist-500 hover:text-danger transition-colors cursor-pointer shrink-0" aria-label="Remove">
        <X size={14} />
      </button>
    </div>
  );
}

// Attachment picker — shows on + button tap
function AttachPicker({ onFile, onClose }) {
  const fileRef = useRef(null);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full mb-2 left-0 z-30 bg-ink-800 border border-ink-700 rounded-2xl p-3 shadow-xl w-52"
    >
      <p className="text-[10px] uppercase tracking-widest text-mist-600 mb-2 px-1">Attach</p>
      <div className="space-y-1">
        <button type="button" onClick={() => { fileRef.current?.click(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-mist-200 hover:bg-ink-700 transition-colors cursor-pointer text-left">
          <Paperclip size={16} className="text-signal-500 shrink-0" /> File or Document
        </button>

      </div>
      {/* Hidden inputs */}
      <input ref={fileRef} type="file" className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
        onChange={onFile} />
      <input ref={cameraRef} type="file" className="hidden"
        accept="image/*" capture="environment"
        onChange={onFile} />
    </motion.div>
  );
}

export default function MessageInput({
  onSend, onTyping, disabled,
  editingMessage, onSubmitEdit, onCancelEdit,
  replyingTo, onCancelReply,
}) {
  const [pickerOpen,       setPickerOpen]       = useState(false);
  const [attachOpen,       setAttachOpen]        = useState(false);
  const [pendingFile,      setPendingFile]       = useState(null); // { name, mime, size, dataUrl, isImage }
  const [isEmpty,          setIsEmpty]           = useState(true);
  const [selectionToolbar, setSelectionToolbar]  = useState(false);
  const [recording,         setRecording]          = useState(false);
  const [recordSeconds,     setRecordSeconds]       = useState(0);
  const mediaRecorderRef  = useRef(null);
  const recordTimerRef    = useRef(null);
  const audioChunksRef    = useRef([]);

  const editorRef      = useRef(null);
  const typingActive   = useRef(false);
  const typingStopTimer= useRef(null);
  const pickerWrapRef  = useRef(null);
  const emojiButtonRef  = useRef(null);
  const attachBtnRef    = useRef(null);
  const attachWrapRef   = useRef(null);
  const cameraInputRef  = useRef(null);

  const isEditing = !!editingMessage;

  // Close emoji on outside click
  useEffect(() => {
    if (!pickerOpen) return undefined;
    function fn(e) {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(e.target))
        setPickerOpen(false);
    }
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [pickerOpen]);

  // Close attach picker on outside click
  useEffect(() => {
    if (!attachOpen) return undefined;
    function fn(e) {
      if (attachWrapRef.current && !attachWrapRef.current.contains(e.target) &&
          attachBtnRef.current && !attachBtnRef.current.contains(e.target))
        setAttachOpen(false);
    }
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [attachOpen]);

  // Hydrate editor when editing
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(editingMessage.text);
      setIsEmpty(!editingMessage.text?.trim());
      focusEnd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  // Selection toolbar
  useEffect(() => {
    function fn() {
      const sel = window.getSelection();
      const el  = editorRef.current;
      if (!sel || !el || sel.rangeCount === 0 || sel.isCollapsed) { setSelectionToolbar(false); return; }
      setSelectionToolbar(el.contains(sel.anchorNode) && el.contains(sel.focusNode));
    }
    document.addEventListener('selectionchange', fn);
    return () => document.removeEventListener('selectionchange', fn);
  }, []);

  function focusEnd() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  function refreshEmptyState() {
    setIsEmpty((editorRef.current?.textContent || '').trim().length === 0);
  }

  function clearEditor() {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setIsEmpty(true);
  }

  function handleInput() {
    if (!typingActive.current) { typingActive.current = true; onTyping(true); }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => { typingActive.current = false; onTyping(false); }, 1500);
    autoFormatEmphasis();
    if (editorRef.current) startNumberedListIfMatched(editorRef.current);
    refreshEmptyState();
  }

  function handleBeforeInput(e) {
    if (disabled) { e.preventDefault(); return; }
    const len = editorRef.current?.textContent.length || 0;
    const ins = typeof e.data === 'string' ? e.data : '';
    if (e.inputType?.startsWith('insert') && ins && len + ins.length > MAX_LENGTH) e.preventDefault();
  }

  function isCaretInsideList() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let node = sel.getRangeAt(0).startContainer;
    const root = editorRef.current;
    while (node && node !== root) {
      if (node.nodeType === 1 && (node.tagName === 'LI' || node.tagName === 'OL')) return true;
      node = node.parentNode;
    }
    return false;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (isCaretInsideList()) return;
      if (!e.shiftKey) { e.preventDefault(); submit(); }
    }
    if (e.key === 'Escape' && isEditing) { onCancelEdit(); clearEditor(); }
  }

  function getInsertionRange() {
    const el  = editorRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) return sel.getRangeAt(0);
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); return r;
  }

  function handlePaste(e) {
    const items   = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (file) loadFileAsAttachment(file);
      return;
    }
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    insertPlainText(text);
    refreshEmptyState();
  }

  function insertPlainText(text) {
    const el = editorRef.current; if (!el) return;
    el.focus();
    const range = getInsertionRange(); range.deleteContents();
    const parts = text.split('\n');
    const frag  = document.createDocumentFragment();
    parts.forEach((p, i) => {
      frag.appendChild(document.createTextNode(p));
      if (i < parts.length - 1) frag.appendChild(document.createElement('br'));
    });
    const last = frag.lastChild;
    range.insertNode(frag);
    if (last) {
      const r = document.createRange(); r.setStartAfter(last); r.collapse(true);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  }

  function insertEmoji(emoji) {
    const el = editorRef.current; if (!el) return;
    el.focus();
    const range = getInsertionRange(); range.deleteContents();
    const node  = document.createTextNode(emoji);
    range.insertNode(node);
    const r = document.createRange(); r.setStartAfter(node); r.collapse(true);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    refreshEmptyState();
  }

  function loadFileAsAttachment(file) {
    if (file.size > MAX_BYTES) {
      alert(`File too large. Maximum size is ${MAX_FILE_MB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setPendingFile({
        name:    file.name,
        mime:    file.type || 'application/octet-stream',
        size:    file.size,
        dataUrl: ev.target.result,
        isImage: file.type.startsWith('image/'),
      });
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (file) loadFileAsAttachment(file);
    e.target.value = '';
  }

  function applyFormat(cmd) { editorRef.current?.focus(); document.execCommand(cmd); }

  function selectAllText() {
    const el = editorRef.current; if (!el) return;
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Your browser does not support audio recording.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size > MAX_BYTES) { alert(`Voice note too large (max ${MAX_FILE_MB} MB).`); return; }
        const reader = new FileReader();
        reader.onload = ev => {
          setPendingFile({ name: 'Voice note.webm', mime: 'audio/webm', size: blob.size, dataUrl: ev.target.result, isImage: false });
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch { alert('Could not access microphone.'); }
  }

  function stopRecording() {
    clearInterval(recordTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setRecordSeconds(0);
  }

  function fmtSeconds(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

  function submit(e) {
    e?.preventDefault?.();
    if (pendingFile) {
      if (pendingFile.isImage) {
        onSend(`[image]${pendingFile.dataUrl}`, replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null);
      } else {
        // Encode as [file]mime|name|dataUrl
        onSend(`[file]${pendingFile.mime}|${pendingFile.name}|${pendingFile.dataUrl}`, replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null);
      }
      setPendingFile(null);
      onCancelReply?.();
      clearEditor();
      return;
    }
    const markdown = editorRef.current ? domToMarkdown(editorRef.current).trim() : '';
    if (!markdown) return;
    if (isEditing) {
      onSubmitEdit(editingMessage.id, markdown);
    } else {
      onSend(markdown, replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null);
      onCancelReply?.();
    }
    clearEditor();
    typingActive.current = false;
    onTyping(false);
  }

  return (
    <div className="relative border-t border-ink-700 bg-ink-900 px-3 py-3">

      {/* Editing banner */}
      {isEditing && (
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="flex items-center gap-1.5 text-xs text-cipher-500"><Check size={13} /> Editing message</span>
          <button type="button" onClick={() => { onCancelEdit(); clearEditor(); }}
            className="text-mist-500 hover:text-mist-100 transition-colors cursor-pointer" aria-label="Cancel edit">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Reply banner */}
      {replyingTo && !isEditing && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-xl bg-signal-700/10 border-l-2 border-signal-500/60">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-signal-400">{replyingTo.senderName}</p>
            <p className="text-xs text-mist-500 truncate">
              {replyingTo.text?.startsWith('[image]') ? '📷 Image' : replyingTo.text?.startsWith('[file]') ? '📎 File' : replyingTo.text}
            </p>
          </div>
          <button type="button" onClick={onCancelReply}
            className="text-mist-600 hover:text-mist-300 transition-colors cursor-pointer shrink-0" aria-label="Cancel reply">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <AttachmentPreview file={pendingFile} onRemove={() => setPendingFile(null)} />
      )}

      {/* Emoji picker */}
      <AnimatePresence>
        {pickerOpen && (
          <div ref={pickerWrapRef} className="absolute bottom-full mb-2 left-3 z-30">
            <EmojiPicker onPick={(em) => { insertEmoji(em); setPickerOpen(false); }} />
          </div>
        )}
      </AnimatePresence>

      {/* Attach picker */}
      <AnimatePresence>
        {attachOpen && (
          <div ref={attachWrapRef} className="absolute bottom-full mb-2 left-12 z-30">
            <AttachPicker
              onFile={handleFileInput}
              onClose={() => setAttachOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Selection formatting toolbar */}
      <AnimatePresence>
        {selectionToolbar && !pendingFile && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-3 z-30 flex items-center gap-0.5 rounded-xl border border-ink-600 bg-ink-800 p-1 shadow-xl"
          >
            {[
              { cmd: 'bold',         icon: Bold,         title: 'Bold' },
              { cmd: 'italic',       icon: Italic,       title: 'Italic' },
              { cmd: 'underline',    icon: UnderlineIcon,title: 'Underline' },
              { cmd: 'strikeThrough',icon: Strikethrough,title: 'Strikethrough' },
            ].map(({ cmd, icon: Icon, title }) => (
              <button key={cmd} type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => applyFormat(cmd)}
                className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
                title={title}>
                <Icon size={14} />
              </button>
            ))}
            <div className="w-px h-4 bg-ink-700 mx-0.5" />
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectAllText}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer" title="Select all">
              <CheckSquare size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Emoji */}
        <button type="button" ref={emojiButtonRef} onClick={() => setPickerOpen(v => !v)} disabled={disabled}
          className={`shrink-0 p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${pickerOpen ? 'text-signal-500 bg-ink-800' : 'text-mist-500 hover:text-signal-500 hover:bg-ink-800'}`}
          aria-label="Emoji">
          <Smile size={19} />
        </button>

        {/* Camera (always visible) */}
        <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={disabled}
          className="shrink-0 p-2 rounded-xl text-mist-500 hover:text-cipher-500 hover:bg-ink-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Open camera">
          <Camera size={18} />
        </button>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleFileInput} />

        {/* Attach (files/docs) */}
        <button type="button" ref={attachBtnRef} onClick={() => setAttachOpen(v => !v)} disabled={disabled}
          className={`shrink-0 p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${attachOpen ? 'text-signal-500 bg-ink-800' : 'text-mist-500 hover:text-signal-500 hover:bg-ink-800'}`}
          aria-label="Attach file">
          <Paperclip size={18} />
        </button>

        {/* Mic / voice note */}
        {recording ? (
          <button type="button" onClick={stopRecording}
            className="shrink-0 p-2 rounded-xl bg-danger/20 text-danger animate-pulse cursor-pointer"
            aria-label="Stop recording" title={`Recording ${fmtSeconds(recordSeconds)}`}>
            <Square size={18} />
          </button>
        ) : (
          <button type="button" onClick={startRecording} disabled={disabled || !!pendingFile}
            className="shrink-0 p-2 rounded-xl text-mist-500 hover:text-cipher-500 hover:bg-ink-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Record voice note">
            <Mic size={18} />
          </button>
        )}

        {/* Editor */}
        <div className="relative flex-1 min-w-0">
          {isEmpty && !pendingFile && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-mist-700 truncate max-w-[calc(100%-1.75rem)]">
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
            aria-label="Message"
            className={`w-full resize-none rounded-xl bg-ink-800 border px-3.5 py-2.5 text-sm text-mist-100 outline-none max-h-32 overflow-y-auto transition-colors ${disabled || pendingFile ? 'opacity-50' : ''} ${isEditing ? 'border-cipher-500' : 'border-ink-600 focus:border-signal-500'}`}
            style={{ minHeight: '2.625rem' }}
          />
        </div>

        {/* Send */}
        <button type="button" onClick={submit}
          disabled={(isEmpty && !pendingFile) || disabled}
          className={`shrink-0 rounded-xl disabled:bg-ink-700 disabled:text-mist-700 disabled:cursor-not-allowed cursor-pointer text-ink-950 p-2.5 transition-colors ${isEditing ? 'bg-cipher-500 hover:bg-cipher-300' : 'bg-signal-500 hover:bg-signal-300'}`}
          aria-label={isEditing ? 'Save' : 'Send'}>
          {isEditing ? <Check size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
