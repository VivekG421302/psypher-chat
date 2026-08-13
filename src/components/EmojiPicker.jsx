import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock3, Smile as SmileyIcon, Cat, Pizza, Trophy, Car, Lightbulb, Heart } from 'lucide-react';

const RECENTS_KEY = 'psypher.recentEmoji';
const MAX_RECENTS = 24;

/**
 * A reasonably broad emoji set, grouped by category. Not exhaustive (that
 * would want a generated dataset), but wide enough to cover the common
 * cases people reach for in a 2-person chat + minigame context.
 */
const CATEGORIES = [
  {
    id: 'smileys',
    label: 'Smileys',
    icon: SmileyIcon,
    emojis: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖'.split(' '),
  },
  {
    id: 'gestures',
    label: 'Gestures & people',
    icon: Heart,
    emojis: '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 ✍️ 💅 🤳 💪 🦾 🫡 🫶 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💌 😹 😻'.split(' '),
  },
  {
    id: 'animals',
    label: 'Animals & nature',
    icon: Cat,
    emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪲 🐛 🦋 🐌 🐞 🐜 🦂 🐢 🐍 🦎 🦖 🐙 🦑 🦀 🐠 🐬 🐳 🐋 🦈 🐊 🐆 🦓 🦍 🐘 🦛 🐪 🦒 🐕 🐩 🐈 🐓 🦃 🌵 🌲 🌳 🌴 🌸 🌼 🌻 🌞 🌙 ⭐ 🔥 💧 🌈 ☀️ ⛅ 🌧️ ❄️'.split(' '),
  },
  {
    id: 'food',
    label: 'Food & drink',
    icon: Pizza,
    emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🧄 🧅 🥔 🍞 🥐 🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍿 🧂 🥫 🍣 🍱 🍜 🍝 🍛 🍤 🍙 🍚 🍢 🍦 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 ☕ 🍵 🧋 🥤 🧃 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉'.split(' '),
  },
  {
    id: 'activities',
    label: 'Activities & games',
    icon: Trophy,
    emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🪀 🏓 🏸 🥊 🥋 🎯 🪁 🎣 🤿 🎽 🛹 🛼 🎿 🏆 🥇 🥈 🥉 🎮 🕹️ 🎲 🧩 ♟️ 🎰 🎳 🃏 🀄 🎴 🎨 🎭 🎪 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻'.split(' '),
  },
  {
    id: 'travel',
    label: 'Travel & places',
    icon: Car,
    emojis: '🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚚 🚲 🛵 🏍️ ✈️ 🚀 🛸 🚁 ⛵ 🚤 🛳️ ⛴️ 🚂 🚆 🚊 🚉 🗽 🗼 🏰 🏯 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ 🏠 🏡 🏢 🏬 🏫 🏥 ⛪ 🕌 🕍 ⛩️ 🌉 🌃 🌌 🎆 🎇 🧭 🗺️'.split(' '),
  },
  {
    id: 'objects',
    label: 'Objects & symbols',
    icon: Lightbulb,
    emojis: '💡 🔦 🕯️ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💿 📷 🎥 📞 ☎️ 📺 📻 🔋 🔌 💰 💎 ⚖️ 🔧 🔨 🛠️ 🔒 🔑 🗝️ 🚪 🪑 🛏️ 🚽 🛁 ⏰ ⌛ ⏳ 🧭 🎁 🎀 🎈 🎉 🎊 🪩 ✉️ 📩 📦 📌 📎 🔖 🏷️ 💬 💭 🗯️ 🔔 🔇 🔊 ⚡ ✨ 💫 💯 ✅ ❌ ❓ ❗ ⚠️ 🔞 ♻️ 🔀 🔁 🔂 ▶️ ⏸️ ⏹️ ⏭️ ⏮️ 🔺 🔻 🃏 🔮'.split(' '),
  },
];

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushRecent(emoji) {
  const current = loadRecents().filter((e) => e !== emoji);
  const next = [emoji, ...current].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — non-critical */
  }
  return next;
}

/**
 * Full emoji picker: search box, category tabs, and a "Recent" strip that
 * remembers what this device actually used. Meant to replace the old
 * 16-emoji static grid so people aren't stuck re-scrolling the same few
 * options.
 */
export default function EmojiPicker({ onPick, className = '', compact = false }) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('recent');
  const [recents, setRecents] = useState(loadRecents);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!compact) searchRef.current?.focus();
  }, [compact]);

  const results = useMemo(() => {
    if (query.trim()) {
      // Naive filter: category label match, since we don't have per-emoji
      // keyword metadata — still helps narrow "food", "animals", etc.
      const q = query.trim().toLowerCase();
      const matchedCats = CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
      if (matchedCats.length) return matchedCats.flatMap((c) => c.emojis);
      return [];
    }
    if (activeCat === 'recent') return recents;
    return CATEGORIES.find((c) => c.id === activeCat)?.emojis || [];
  }, [query, activeCat, recents]);

  function pick(emoji) {
    setRecents(pushRecent(emoji));
    onPick(emoji);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.14 }}
      className={`flex flex-col rounded-2xl border border-ink-600 bg-ink-800 shadow-xl overflow-hidden ${className}`}
      style={{ width: compact ? 240 : 288, height: compact ? 260 : 320 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-ink-700 shrink-0">
        <Search size={13} className="text-mist-600 shrink-0" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories…"
          className="flex-1 bg-transparent text-xs text-mist-100 placeholder:text-mist-700 outline-none min-w-0"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-7 gap-0.5 content-start">
        {results.length === 0 && (
          <p className="col-span-7 text-center text-[11px] text-mist-700 py-8">
            {activeCat === 'recent' ? 'No recent emoji yet — pick a few!' : 'No matches.'}
          </p>
        )}
        {results.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => pick(emoji)}
            className="text-lg leading-none aspect-square flex items-center justify-center rounded-lg hover:bg-ink-700 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-t border-ink-700 shrink-0 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => { setActiveCat('recent'); setQuery(''); }}
          title="Recent"
          className={`shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${
            activeCat === 'recent' && !query ? 'bg-signal-700/20 text-signal-500' : 'text-mist-500 hover:text-mist-200 hover:bg-ink-700'
          }`}
        >
          <Clock3 size={14} />
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setActiveCat(c.id); setQuery(''); }}
            title={c.label}
            className={`shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeCat === c.id && !query ? 'bg-signal-700/20 text-signal-500' : 'text-mist-500 hover:text-mist-200 hover:bg-ink-700'
            }`}
          >
            <c.icon size={14} />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
