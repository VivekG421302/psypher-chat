import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Send, Smile, X, Check, Bold, Italic, List, Image as ImageIcon } from 'lucide-react';
import EmojiPicker from './EmojiPicker.jsx';

export default function MessageInput({
  onSend,
  onTyping,
  disabled,
  editingMessage,
  onSubmitEdit,
  onCancelEdit,
}) {
  const [value, setValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // { dataUrl, name }
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);
  const textareaRef = useRef(null);
  const pickerWrapRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  const isEditing = !!editingMessage;

  // ── Close picker on outside click (excluding the toggle button itself) ──
  useEffect(() => {
    if (!pickerOpen) return undefined;
    function onDocClick(e) {
      if (
        pickerWrapRef.current &&
        !pickerWrapRef.current.contains(e.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target)
      ) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  useEffect(() => {
    if (isEditing) {
      setValue(editingMessage.text);
      textareaRef.current?.focus();
    }
  }, [editingMessage, isEditing]);

  // ── Paste handler: intercept image pastes ──
  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type.startsWith('image/'));
    if (!imgItem) return;
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage({ dataUrl: ev.target.result, name: file.name || 'image.png' });
    reader.readAsDataURL(file);
  }, []);

  function handleChange(e) {
    setValue(e.target.value);
    if (!typingActive.current) {
      typingActive.current = true;
      onTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      typingActive.current = false;
      onTyping(false);
    }, 1500);
  }

  function submit(e) {
    e?.preventDefault();
    // Image send
    if (pendingImage) {
      onSend(`[image]${pendingImage.dataUrl}`);
      setPendingImage(null);
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isEditing) {
      onSubmitEdit(editingMessage.id, trimmed);
    } else {
      onSend(trimmed);
    }
    setValue('');
    typingActive.current = false;
    onTyping(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
    if (e.key === 'Escape' && isEditing) {
      onCancelEdit();
      setValue('');
    }
  }

  // ── Formatting helpers ──
  function wrapSelection(before, after = before) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }

  function insertNumberedList() {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    // Count existing lines to pick next number
    const linesBefore = value.slice(0, pos).split('\n');
    const num = linesBefore.length;
    const insert = `\n${num}. `;
    const newVal = value.slice(0, pos) + insert + value.slice(pos);
    setValue(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(pos + insert.length, pos + insert.length);
    }, 0);
  }

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage({ dataUrl: ev.target.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
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
            onClick={() => { onCancelEdit(); setValue(''); }}
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

      {/* Emoji picker */}
      <AnimatePresence>
        {pickerOpen && (
          <div ref={pickerWrapRef} className="absolute bottom-full mb-2 left-3 z-30">
            <EmojiPicker
              onPick={(em) => {
                setValue((v) => v + em);
                textareaRef.current?.focus();
                setPickerOpen(false);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 mb-2 px-0.5">
        <button
          type="button"
          onClick={() => wrapSelection('**')}
          className="p-1.5 rounded-lg text-mist-600 hover:text-mist-100 hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label="Bold"
          title="Bold (**text**)"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('_')}
          className="p-1.5 rounded-lg text-mist-600 hover:text-mist-100 hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label="Italic"
          title="Italic (_text_)"
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          onClick={insertNumberedList}
          className="p-1.5 rounded-lg text-mist-600 hover:text-mist-100 hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label="Numbered list"
          title="Numbered list"
        >
          <List size={13} />
        </button>
        <div className="w-px h-4 bg-ink-700 mx-1" />
        <button
          type="button"
          ref={emojiButtonRef}
          onClick={() => setPickerOpen((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            pickerOpen ? 'text-signal-500 bg-ink-800' : 'text-mist-600 hover:text-signal-500 hover:bg-ink-800'
          }`}
          aria-label="Emoji picker"
        >
          <Smile size={13} />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg text-mist-600 hover:text-signal-500 hover:bg-ink-800 transition-colors cursor-pointer"
          aria-label="Attach image"
          title="Attach image"
        >
          <ImageIcon size={13} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            disabled
              ? 'Reconnecting…'
              : isEditing
              ? 'Edit your message…'
              : 'Type an encrypted message… (Shift+Enter for new line)'
          }
          rows={1}
          maxLength={1000}
          disabled={disabled || !!pendingImage}
          className={`flex-1 resize-none rounded-xl bg-ink-800 border px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 outline-none max-h-32 transition-colors disabled:opacity-50 ${
            isEditing ? 'border-cipher-500' : 'border-ink-600 focus:border-signal-500'
          }`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={(!value.trim() && !pendingImage) || disabled}
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
