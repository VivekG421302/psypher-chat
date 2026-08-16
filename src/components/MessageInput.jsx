import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send, Smile, X, Check, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, CheckSquare, Paperclip,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker.jsx';
import { domToMarkdown, markdownToHtml, autoFormatEmphasis, startNumberedListIfMatched } from '../lib/richText.jsx';

const MAX_LENGTH = 1000;

export default function MessageInput({
  onSend,
  onTyping,
  disabled,
  editingMessage,
  onSubmitEdit,
  onCancelEdit,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // { dataUrl, name }
  const [isEmpty, setIsEmpty] = useState(true);
  const [selectionToolbar, setSelectionToolbar] = useState(false);

  const editorRef = useRef(null);
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);
  const pickerWrapRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  const isEditing = !!editingMessage;

  // ── Close emoji picker on outside click, or after picking an emoji ──
  useEffect(() => {
    if (!pickerOpen) return undefined;
    function onDocClick(e) {
      if (
        pickerWrapRef.current && !pickerWrapRef.current.contains(e.target) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target)
      ) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  // ── Hydrate the editor when entering edit mode ──
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(editingMessage.text);
      setIsEmpty(!editingMessage.text?.trim());
      focusEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  // ── Show a small floating toolbar whenever there's a real selection inside the input ──
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      const el = editorRef.current;
      if (!sel || !el || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelectionToolbar(false);
        return;
      }
      setSelectionToolbar(el.contains(sel.anchorNode) && el.contains(sel.focusNode));
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  function focusEnd() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function refreshEmptyState() {
    const text = editorRef.current?.textContent || '';
    setIsEmpty(text.trim().length === 0);
  }

  function clearEditor() {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setIsEmpty(true);
  }

  // ── Typing indicator + live *bold*/_italic_/~strike~/#underline# + "1. " list auto-start ──
  function handleInput() {
    if (!typingActive.current) {
      typingActive.current = true;
      onTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      typingActive.current = false;
      onTyping(false);
    }, 1500);

    autoFormatEmphasis();
    if (editorRef.current) startNumberedListIfMatched(editorRef.current);
    refreshEmptyState();
  }

  function handleBeforeInput(e) {
    if (disabled) { e.preventDefault(); return; }
    const currentLen = editorRef.current?.textContent.length || 0;
    const insertData = typeof e.data === 'string' ? e.data : '';
    if (e.inputType?.startsWith('insert') && insertData && currentLen + insertData.length > MAX_LENGTH) {
      e.preventDefault();
    }
  }

  function isCaretInsideList() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const root = editorRef.current;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== root) {
      if (node.nodeType === 1 && (node.tagName === 'LI' || node.tagName === 'OL')) return true;
      node = node.parentNode;
    }
    return false;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      // Inside an active numbered list, let the browser continue/exit it
      // natively instead of sending the message.
      if (isCaretInsideList()) return;
      if (!e.shiftKey) {
        e.preventDefault();
        submit();
      }
    }
    if (e.key === 'Escape' && isEditing) {
      onCancelEdit();
      clearEditor();
    }
  }

  function getInsertionRange() {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      return sel.getRangeAt(0);
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    return range;
  }

  function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setPendingImage({ dataUrl: ev.target.result, name: file.name || 'image.png' });
      reader.readAsDataURL(file);
      return;
    }
    // Plain-text only, to avoid pasting in foreign rich HTML/styles
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    insertPlainText(text);
    refreshEmptyState();
  }

  function insertPlainText(text) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = getInsertionRange();
    range.deleteContents();
    const parts = text.split('\n');
    const frag = document.createDocumentFragment();
    parts.forEach((part, i) => {
      frag.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) frag.appendChild(document.createElement('br'));
    });
    const lastNode = frag.lastChild;
    range.insertNode(frag);
    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  function insertEmoji(emoji) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = getInsertionRange();
    range.deleteContents();
    const node = document.createTextNode(emoji);
    range.insertNode(node);
    const newRange = document.createRange();
    newRange.setStartAfter(node);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);
    refreshEmptyState();
  }

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage({ dataUrl: ev.target.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ── Selection formatting toolbar actions ──
  function applyFormat(cmd) {
    editorRef.current?.focus();
    document.execCommand(cmd);
  }

  function selectAllText() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function submit(e) {
    e?.preventDefault?.();
    if (pendingImage) {
      onSend(`[image]${pendingImage.dataUrl}`);
      setPendingImage(null);
      clearEditor();
      return;
    }
    const markdown = editorRef.current ? domToMarkdown(editorRef.current).trim() : '';
    if (!markdown) return;
    if (isEditing) {
      onSubmitEdit(editingMessage.id, markdown);
    } else {
      onSend(markdown);
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
          <span className="flex items-center gap-1.5 text-xs text-cipher-500">
            <Check size={13} /> Editing message
          </span>
          <button
            type="button"
            onClick={() => { onCancelEdit(); clearEditor(); }}
            className="text-mist-500 hover:text-mist-100 transition-colors cursor-pointer"
            aria-label="Cancel edit"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pending image preview */}
      {pendingImage && (
        <div className="mb-2 flex items-center gap-2 bg-ink-800 rounded-xl px-3 py-2 border border-ink-600">
          <img src={pendingImage.dataUrl} alt="preview" className="w-14 h-14 object-cover rounded-lg shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-mist-300 truncate">{pendingImage.name}</p>
            <p className="text-[11px] text-mist-600">Image ready to send</p>
          </div>
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            className="text-mist-500 hover:text-danger transition-colors cursor-pointer"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Emoji picker popup */}
      <AnimatePresence>
        {pickerOpen && (
          <div ref={pickerWrapRef} className="absolute bottom-full mb-2 left-3 z-30">
            <EmojiPicker
              onPick={(em) => {
                insertEmoji(em);
                setPickerOpen(false);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Floating formatting toolbar — only when text is selected */}
      <AnimatePresence>
        {selectionToolbar && !pendingImage && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-3 z-30 flex items-center gap-0.5 rounded-xl border border-ink-600 bg-ink-800 p-1 shadow-xl"
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('bold')}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
              aria-label="Bold"
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('italic')}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
              aria-label="Italic"
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('underline')}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
              aria-label="Underline"
              title="Underline"
            >
              <UnderlineIcon size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('strikeThrough')}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
              aria-label="Strikethrough"
              title="Strikethrough"
            >
              <Strikethrough size={14} />
            </button>
            <div className="w-px h-4 bg-ink-700 mx-0.5" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={selectAllText}
              className="p-1.5 rounded-lg text-mist-300 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
              aria-label="Select all"
              title="Select all"
            >
              <CheckSquare size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row: emoji on the left, attachment on the right */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          ref={emojiButtonRef}
          onClick={() => setPickerOpen((v) => !v)}
          disabled={disabled}
          className={`shrink-0 p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            pickerOpen ? 'text-signal-500 bg-ink-800' : 'text-mist-500 hover:text-signal-500 hover:bg-ink-800'
          }`}
          aria-label="Emoji picker"
        >
          <Smile size={19} />
        </button>

        <div className="relative flex-1 min-w-0">
          {isEmpty && !pendingImage && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-mist-700 truncate max-w-[calc(100%-1.75rem)]">
              {disabled ? 'Reconnecting…' : isEditing ? 'Edit your message…' : 'Type a message…  ·  / to focus  ·  G for games'}
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable={!disabled && !pendingImage}
            suppressContentEditableWarning
            onInput={handleInput}
            onBeforeInput={handleBeforeInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            data-chat-input
            role="textbox"
            aria-multiline="true"
            aria-label="Message"
            className={`w-full resize-none rounded-xl bg-ink-800 border px-3.5 py-2.5 text-sm text-mist-100 outline-none max-h-32 overflow-y-auto transition-colors ${
              disabled || pendingImage ? 'opacity-50' : ''
            } ${isEditing ? 'border-cipher-500' : 'border-ink-600 focus:border-signal-500'}`}
            style={{ minHeight: '2.625rem' }}
          />
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0 p-2 rounded-xl text-mist-500 hover:text-signal-500 hover:bg-ink-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Attach image"
          title="Attach image"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />

        <button
          type="button"
          onClick={submit}
          disabled={(isEmpty && !pendingImage) || disabled}
          className={`shrink-0 rounded-xl disabled:bg-ink-700 disabled:text-mist-700 disabled:cursor-not-allowed cursor-pointer text-ink-950 p-2.5 transition-colors ${
            isEditing ? 'bg-cipher-500 hover:bg-cipher-300' : 'bg-signal-500 hover:bg-signal-300'
          }`}
          aria-label={isEditing ? 'Save edit' : 'Send message'}
        >
          {isEditing ? <Check size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
