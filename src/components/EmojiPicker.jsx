import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock3, Smile as SmileyIcon, Cat, Pizza, Trophy, Car, Lightbulb, Heart, Tv2, Loader2 } from 'lucide-react';

const RECENTS_KEY = 'psypher.recentEmoji';
const MAX_RECENTS = 24;

// Giphy public beta key — works for demo/personal apps
// Tenor v2 anonymous test key (official from Tenor/Google docs)
const TENOR_KEY   = 'LIVDSRZULELA';
const TENOR_CLIENT = 'psypher_chat';
const GIF_LIMIT   = 24;

const CATEGORIES = [
  { id: 'smileys',    label: 'Smileys',            icon: SmileyIcon,
    emojis: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖'.split(' ') },
  { id: 'gestures',  label: 'Gestures & people',   icon: Heart,
    emojis: '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 ✍️ 💅 🤳 💪 🦾 🫡 🫶 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💌 😹 😻'.split(' ') },
  { id: 'animals',   label: 'Animals & nature',    icon: Cat,
    emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪲 🐛 🦋 🐌 🐞 🐜 🦂 🐢 🐍 🦎 🦖 🐙 🦑 🦀 🐠 🐬 🐳 🐋 🦈 🐊 🐆 🦓 🦍 🐘 🦛 🐪 🦒 🐕 🐩 🐈 🐓 🦃 🌵 🌲 🌳 🌴 🌸 🌼 🌻 🌞 🌙 ⭐ 🔥 💧 🌈 ☀️ ⛅ 🌧️ ❄️'.split(' ') },
  { id: 'food',      label: 'Food & drink',         icon: Pizza,
    emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🧄 🧅 🥔 🍞 🥐 🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍿 🧂 🥫 🍣 🍱 🍜 🍝 🍛 🍤 🍙 🍚 🍢 🍦 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 ☕ 🍵 🧋 🥤 🧃 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉'.split(' ') },
  { id: 'activities',label: 'Activities & games',   icon: Trophy,
    emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🪀 🏓 🏸 🥊 🥋 🎯 🪁 🎣 🤿 🎽 🛹 🛼 🎿 🏆 🥇 🥈 🥉 🎮 🕹️ 🎲 🧩 ♟️ 🎰 🎳 🃏 🀄 🎴 🎨 🎭 🎪 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻'.split(' ') },
  { id: 'travel',    label: 'Travel & places',      icon: Car,
    emojis: '🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚚 🚲 🛵 🏍️ ✈️ 🚀 🛸 🚁 ⛵ 🚤 🛳️ ⛴️ 🚂 🚆 🚊 🚉 🗽 🗼 🏰 🏯 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ 🏠 🏡 🏢 🏬 🏫 🏥 ⛪ 🕌 🕍 ⛩️ 🌉 🌃 🌌 🎆 🎇 🧭 🗺️'.split(' ') },
  { id: 'objects',   label: 'Objects & symbols',    icon: Lightbulb,
    emojis: '💡 🔦 🕯️ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💿 📷 🎥 📞 ☎️ 📺 📻 🔋 🔌 💰 💎 ⚖️ 🔧 🔨 🛠️ 🔒 🔑 🗝️ 🚪 🪑 🛏️ 🚽 🛁 ⏰ ⌛ ⏳ 🧭 🎁 🎀 🎈 🎉 🎊 🪩 ✉️ 📩 📦 📌 📎 🔖 🏷️ 💬 💭 🗯️ 🔔 🔇 🔊 ⚡ ✨ 💫 💯 ✅ ❌ ❓ ❗ ⚠️ ♻️ 🔀 🔁 🔂 ▶️ ⏸️ ⏹️ ⏭️ ⏮️ 🔺 🔻 🃏 🔮'.split(' ') },
];

function loadRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; }
}
function pushRecent(emoji) {
  const next = [emoji, ...loadRecents().filter(e => e !== emoji)].slice(0, MAX_RECENTS);
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /**/ }
  return next;
}

// ── GIF tab ────────────────────────────────────────────────────────────────────
function GifTab({ onPick }) {
  const [query,   setQuery]   = useState('');
  const [gifs,    setGifs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const fetchGifs = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const base = 'https://tenor.googleapis.com/v2';
      const params = `key=${TENOR_KEY}&client_key=${TENOR_CLIENT}&limit=${GIF_LIMIT}&media_filter=gif`;
      const endpoint = q.trim()
        ? `${base}/search?q=${encodeURIComponent(q)}&${params}`
        : `${base}/featured?${params}`;
      const res  = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Tenor v2: results array with .media_formats.gif.url and .media_formats.tinygif.url
      const items = (json.results || []).map(r => ({
        id:      r.id,
        title:   r.title || '',
        preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || '',
        full:    r.media_formats?.gif?.url || '',
      })).filter(r => r.preview && r.full);
      setGifs(items);
    } catch (err) {
      setError('Could not load GIFs — ' + (err.message || 'check connection'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trending on mount
  useEffect(() => { fetchGifs(''); inputRef.current?.focus(); }, [fetchGifs]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(val), 500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-ink-700 shrink-0">
        <Search size={13} className="text-mist-600 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={handleSearch}
          placeholder="Search GIFs, memes…"
          className="flex-1 bg-transparent text-xs text-mist-100 placeholder:text-mist-700 outline-none min-w-0"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); fetchGifs(''); }}
            className="text-mist-600 hover:text-mist-300 cursor-pointer">
            <Search size={11} />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-mist-600">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-[11px]">Loading GIFs…</span>
          </div>
        )}
        {!loading && error && (
          <p className="text-center text-[11px] text-red-400 py-8 px-3">{error}</p>
        )}
        {!loading && !error && gifs.length === 0 && (
          <p className="text-center text-[11px] text-mist-600 py-8">No GIFs found</p>
        )}
        {!loading && !error && gifs.length > 0 && (
          /* 2-column masonry grid */
          <div className="columns-2 gap-1.5 space-y-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onPick(`[gif]${gif.full}`)}
                className="w-full break-inside-avoid rounded-lg overflow-hidden cursor-pointer hover:opacity-80 active:scale-95 transition-all block"
              >
                <img
                  src={gif.preview}
                  alt={gif.title || 'GIF'}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
        {/* Giphy attribution (required by their ToS) */}
        {!loading && gifs.length > 0 && (
          <p className="text-center text-[10px] text-mist-700 pt-2 pb-1">Powered by Tenor</p>
        )}
      </div>
    </div>
  );
}

// ── Main picker ────────────────────────────────────────────────────────────────
export default function EmojiPicker({ onPick, className = '', compact = false }) {
  const [query,     setQuery]     = useState('');
  const [activeCat, setActiveCat] = useState('recent');
  const [recents,   setRecents]   = useState(loadRecents);
  const searchRef = useRef(null);

  const isGif = activeCat === 'gif';

  useEffect(() => {
    if (!compact && !isGif) searchRef.current?.focus();
  }, [compact, isGif]);

  const results = useMemo(() => {
    if (isGif) return [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const matchedCats = CATEGORIES.filter(c => c.label.toLowerCase().includes(q));
      return matchedCats.length ? matchedCats.flatMap(c => c.emojis) : [];
    }
    if (activeCat === 'recent') return recents;
    return CATEGORIES.find(c => c.id === activeCat)?.emojis || [];
  }, [query, activeCat, recents, isGif]);

  const pickEmoji = (emoji) => { setRecents(pushRecent(emoji)); onPick(emoji); };
  const pickGif   = (gifStr) => { onPick(gifStr); };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.14 }}
      className={`flex flex-col rounded-2xl border border-ink-600 bg-ink-800 shadow-xl overflow-hidden ${className}`}
      style={{ width: compact ? 240 : 300, height: compact ? 260 : 360 }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Emoji tab content ── */}
      {!isGif && (
        <>
          {/* Search */}
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-ink-700 shrink-0">
            <Search size={13} className="text-mist-600 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
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
              <button key={`${emoji}-${i}`} type="button" onClick={() => pickEmoji(emoji)}
                className="text-lg leading-none aspect-square flex items-center justify-center rounded-lg hover:bg-ink-700 hover:scale-110 active:scale-95 transition-transform cursor-pointer">
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── GIF tab content ── */}
      {isGif && (
        <AnimatePresence mode="wait">
          <motion.div key="gif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
            <GifTab onPick={pickGif} />
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Bottom tabs ── */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-t border-ink-700 shrink-0 overflow-x-auto no-scrollbar">
        {/* Recent */}
        <button type="button" onClick={() => { setActiveCat('recent'); setQuery(''); }} title="Recent"
          className={`shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${activeCat === 'recent' && !query ? 'bg-signal-700/20 text-signal-500' : 'text-mist-500 hover:text-mist-200 hover:bg-ink-700'}`}>
          <Clock3 size={14} />
        </button>

        {/* Emoji categories */}
        {CATEGORIES.map(c => (
          <button key={c.id} type="button" onClick={() => { setActiveCat(c.id); setQuery(''); }} title={c.label}
            className={`shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${activeCat === c.id && !query ? 'bg-signal-700/20 text-signal-500' : 'text-mist-500 hover:text-mist-200 hover:bg-ink-700'}`}>
            <c.icon size={14} />
          </button>
        ))}

        {/* GIF tab — highlighted differently */}
        <button type="button" onClick={() => { setActiveCat('gif'); setQuery(''); }} title="GIFs"
          className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${activeCat === 'gif' ? 'bg-violet-600/30 text-violet-400' : 'text-mist-500 hover:text-violet-400 hover:bg-ink-700'}`}>
          GIF
        </button>
      </div>
    </motion.div>
  );
}
