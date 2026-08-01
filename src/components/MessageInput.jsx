import { useEffect, useRef, useState } from 'react';
import { Send, Smile, X, Check } from 'lucide-react';

const QUICK_EMOJI = ['😀', '😂', '😍', '😢', '😮', '😡', '👍', '👎', '🙏', '🎉', '🔥', '💀', '❤️', '🤝', '👀', '✨'];

export default function MessageInput({ onSend, onTyping, disabled, editingMessage, onSubmitEdit, onCancelEdit }) {
  const [value, setValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);
  const textareaRef = useRef(null);

  const isEditing = !!editingMessage;

  useEffect(() => {
    if (isEditing) {
      setValue(editingMessage.text);
      textareaRef.current?.focus();
    }
  }, [editingMessage, isEditing]);

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
      submit(e);
    }
    if (e.key === 'Escape' && isEditing) {
      onCancelEdit();
      setValue('');
    }
  }

  return (
    <form onSubmit={submit} className="relative border-t border-ink-700 bg-ink-900 px-3 py-3">
      {isEditing && (
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="flex items-center gap-1.5 text-xs text-cipher-500">
            <Check size={13} /> Editing message
          </span>
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              setValue('');
            }}
            className="text-mist-500 hover:text-mist-100 transition-colors enabled:cursor-pointer"
            aria-label="Cancel edit"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {pickerOpen && (
        <div className="absolute bottom-full mb-2 left-3 right-3 sm:right-auto sm:w-72 rounded-xl border border-ink-600 bg-ink-800 p-2.5 grid grid-cols-8 gap-1 shadow-lg">
          {QUICK_EMOJI.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => {
                setValue((v) => v + em);
                setPickerOpen(false);
              }}
              className="text-lg rounded-lg py-1 hover:bg-ink-700 transition-colors enabled:cursor-pointer"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="shrink-0 rounded-lg p-2.5 text-mist-500 hover:text-signal-500 hover:bg-ink-800 transition-colors enabled:cursor-pointer"
          aria-label="Emoji picker"
        >
          <Smile size={19} />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Reconnecting…' : isEditing ? 'Edit your message…' : 'Type an encrypted message…'}
          rows={1}
          maxLength={1000}
          disabled={disabled}
          className={`flex-1 resize-none rounded-xl bg-ink-800 border px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 outline-none max-h-32 transition-colors disabled:opacity-50 ${
            isEditing ? 'border-cipher-500' : 'border-ink-600 focus:border-signal-500'
          }`}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className={`shrink-0 rounded-xl disabled:bg-ink-700 disabled:text-mist-700 disabled:cursor-not-allowed enabled:cursor-pointer text-ink-950 p-2.5 transition-colors ${
            isEditing ? 'bg-cipher-500 hover:bg-cipher-300' : 'bg-signal-500 hover:bg-signal-300'
          }`}
          aria-label={isEditing ? 'Save edit' : 'Send message'}
        >
          {isEditing ? <Check size={18} /> : <Send size={18} />}
        </button>
      </div>
    </form>
  );
}
