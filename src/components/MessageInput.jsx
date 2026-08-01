import { useRef, useState } from 'react';
import { Send, Smile } from 'lucide-react';

const QUICK_EMOJI = ['😀', '😂', '😍', '😢', '😮', '😡', '👍', '👎', '🙏', '🎉', '🔥', '💀', '❤️', '🤝', '👀', '✨'];

export default function MessageInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);

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
    onSend(trimmed);
    setValue('');
    typingActive.current = false;
    onTyping(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      submit(e);
    }
  }

  return (
    <form onSubmit={submit} className="relative border-t border-ink-700 bg-ink-900 px-3 py-3">
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
              className="text-lg rounded-lg py-1 hover:bg-ink-700 transition-colors"
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
          className="shrink-0 rounded-lg p-2.5 text-mist-500 hover:text-signal-500 hover:bg-ink-800 transition-colors"
          aria-label="Emoji picker"
        >
          <Smile size={19} />
        </button>
        <textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type an encrypted message…"
          rows={1}
          maxLength={1000}
          className="flex-1 resize-none rounded-xl bg-ink-800 border border-ink-600 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500 outline-none max-h-32 transition-colors"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="shrink-0 rounded-xl bg-signal-500 disabled:bg-ink-700 disabled:text-mist-700 text-ink-950 p-2.5 hover:bg-signal-300 transition-colors"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}
