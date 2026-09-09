import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Smile as SmileyIcon, Cat, Pizza, Trophy, Car, Lightbulb, Heart, Clock3, Loader2, X } from 'lucide-react';

const RECENTS_KEY = 'psypher.recentEmoji';
const MAX_RECENTS = 24;
const GIPHY_KEY   = '0oypooBOsHrDnvMr5A9zDTj1VuelTQ4s';
const GIF_LIMIT   = 30;

const CATEGORIES = [
  { id: 'smileys',    label: 'Smileys',   icon: SmileyIcon,
    emojis: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖'.split(' ') },
  { id: 'gestures',  label: 'People',    icon: Heart,
    emojis: '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 ✍️ 💅 🤳 💪 🦾 🫡 🫶 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💌 😹 😻'.split(' ') },
  { id: 'animals',   label: 'Animals',   icon: Cat,
    emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦂 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐬 🐳 🦈 🐊 🐘 🦒 🐕 🐈 🌵 🌲 🌸 🌼 🌻 🌞 🌙 ⭐ 🔥 💧 🌈 ☀️ ❄️'.split(' ') },
  { id: 'food',      label: 'Food',      icon: Pizza,
    emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🌽 🥕 🧄 🧅 🥔 🍞 🥐 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍿 🍣 🍱 🍜 🍝 🍛 🍤 🍙 🍚 🍦 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 ☕ 🍵 🧋 🥤 🍺 🥂 🍷 🥃 🍸 🍹'.split(' ') },
  { id: 'activities',label: 'Activity',  icon: Trophy,
    emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🎯 🎣 🤿 🎽 🛹 🎿 🏆 🥇 🥈 🥉 🎮 🕹️ 🎲 🧩 ♟️ 🎰 🎳 🎨 🎭 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻'.split(' ') },
  { id: 'travel',    label: 'Travel',    icon: Car,
    emojis: '🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚲 🛵 🏍️ ✈️ 🚀 🛸 🚁 ⛵ 🚤 🚂 🚆 🗽 🗼 🏰 🏯 🎡 🎢 ⛲ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🏕️ 🏠 🏡 🏢 🌉 🌃 🌌 🎆 🎇 🗺️'.split(' ') },
  { id: 'objects',   label: 'Objects',   icon: Lightbulb,
    emojis: '💡 🔦 🕯️ 📱 💻 ⌨️ 🖥️ 📷 🎥 📞 📺 📻 🔋 💰 💎 ⚖️ 🔧 🔨 🛠️ 🔒 🔑 🚪 🛏️ 🚽 ⏰ ⌛ 🧭 🎁 🎀 🎈 🎉 🎊 ✉️ 📩 📦 📌 📎 🔖 💬 💭 🔔 ⚡ ✨ 💫 💯 ✅ ❌ ❓ ❗ ⚠️ ♻️ 🔮'.split(' ') },
];

function loadRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; }
}
function pushRecent(emoji) {
  const next = [emoji, ...loadRecents().filter(e => e !== emoji)].slice(0, MAX_RECENTS);
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /**/ }
  return next;
}

// ── GIF masonry ───────────────────────────────────────────────────────────────
function GifTab({ onPick }) {
  const [query,   setQuery]   = useState('');
  const [gifs,    setGifs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const fetchGifs = useCallback(async (q) => {
    setLoading(true); setError(null);
    try {
      const url = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${GIF_LIMIT}&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=${GIF_LIMIT}&rating=pg-13`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setGifs((json.data || []).map(r => ({
        id:      r.id,
        title:   r.title || '',
        preview: r.images?.fixed_height_small?.url || r.images?.preview_gif?.url || '',
        full:    r.images?.downsized?.url || r.images?.fixed_height?.url || '',
        h:       Number(r.images?.fixed_height_small?.height || 100),
        w:       Number(r.images?.fixed_height_small?.width  || 100),
      })).filter(r => r.preview && r.full));
    } catch (e) {
      setError('Could not load GIFs');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGifs(''); setTimeout(() => inputRef.current?.focus(), 100); }, [fetchGifs]);

  const handleSearch = (e) => {
    const val = e.target.value; setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(val), 500);
  };

  // Split into 2 columns for Pinterest-style masonry
  const [col1, col2] = useMemo(() => {
    const c1 = [], c2 = [];
    let h1 = 0, h2 = 0;
    for (const g of gifs) {
      const ratio = g.w > 0 ? g.h / g.w : 1;
      const renderH = ratio * 140; // approx rendered height at col width ~140px
      if (h1 <= h2) { c1.push(g); h1 += renderH; }
      else          { c2.push(g); h2 += renderH; }
    }
    return [c1, c2];
  }, [gifs]);

  const GifItem = ({ gif }) => (
    <button type="button" onClick={() => onPick(`[gif]${gif.full}`)}
      className="w-full block rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform mb-1.5">
      <img src={gif.preview} alt={gif.title} className="w-full h-auto block" loading="lazy" />
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-ink-700 rounded-full px-3 py-1.5">
          <Search size={13} className="text-mist-600 shrink-0" />
          <input ref={inputRef} value={query} onChange={handleSearch}
            placeholder="Search GIFs…"
            className="flex-1 bg-transparent text-xs text-mist-100 placeholder:text-mist-600 outline-none min-w-0" />
          {query && (
            <button type="button" onClick={() => { setQuery(''); fetchGifs(''); }}>
              <X size={12} className="text-mist-600 hover:text-mist-300" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading && (
          <div className="flex items-center justify-center h-32 gap-2 text-mist-600">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}
        {!loading && error && <p className="text-center text-xs text-red-400 py-8">{error}</p>}
        {!loading && !error && gifs.length === 0 && <p className="text-center text-xs text-mist-600 py-8">No GIFs found</p>}
        {!loading && !error && gifs.length > 0 && (
          <div className="flex gap-1.5">
            <div className="flex-1">{col1.map(g => <GifItem key={g.id} gif={g} />)}</div>
            <div className="flex-1">{col2.map(g => <GifItem key={g.id} gif={g} />)}</div>
          </div>
        )}
        {!loading && gifs.length > 0 && (
          <p className="text-center text-[10px] text-mist-700 pb-1">Powered by GIPHY</p>
        )}
      </div>
    </div>
  );
}

// ── Emoji grid ────────────────────────────────────────────────────────────────
function EmojiGrid({ emojis, onPick, empty }) {
  if (emojis.length === 0) return <p className="col-span-7 text-center text-xs text-mist-600 py-8">{empty}</p>;
  return (
    <>
      {emojis.map((emoji, i) => (
        <button key={`${emoji}-${i}`} type="button" onClick={() => onPick(emoji)}
          className="text-xl leading-none aspect-square flex items-center justify-center rounded-xl hover:bg-ink-700 active:scale-90 transition-transform cursor-pointer">
          {emoji}
        </button>
      ))}
    </>
  );
}

// ── Main picker — WhatsApp-style bottom sheet ──────────────────────────────────
export default function EmojiPicker({ onPick, onClose }) {
  const [tab,     setTab]     = useState('emoji'); // 'emoji' | 'gif'
  const [catId,   setCatId]   = useState('recent');
  const [query,   setQuery]   = useState('');
  const [recents, setRecents] = useState(loadRecents);
  const searchRef = useRef(null);

  const results = useMemo(() => {
    if (tab !== 'emoji') return [];
    if (query.trim()) {
      const q = query.toLowerCase();
      return CATEGORIES.filter(c => c.label.toLowerCase().includes(q)).flatMap(c => c.emojis);
    }
    if (catId === 'recent') return recents;
    return CATEGORIES.find(c => c.id === catId)?.emojis || [];
  }, [tab, query, catId, recents]);

  const pickEmoji = (emoji) => { setRecents(pushRecent(emoji)); onPick(emoji); };
  const pickGif   = (val)   => { onPick(val); };

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 40 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-ink-900 border-t border-ink-700 rounded-t-2xl flex flex-col"
      style={{ height: '52vh', maxHeight: 420 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Handle */}
      <div className="w-10 h-1 bg-ink-600 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 shrink-0">
        {/* Search box */}
        {tab === 'emoji' && (
          <div className="flex items-center gap-1.5 bg-ink-800 rounded-full px-3 py-1.5 flex-1 min-w-0 mr-2">
            <Search size={13} className="text-mist-600 shrink-0" />
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="flex-1 bg-transparent text-xs text-mist-100 placeholder:text-mist-600 outline-none min-w-0" />
          </div>
        )}
        {tab === 'gif' && <div className="flex-1" />}

        {/* Emoji / GIF toggle */}
        <div className="flex items-center bg-ink-800 rounded-full p-0.5 shrink-0">
          <button type="button" onClick={() => setTab('emoji')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${tab === 'emoji' ? 'bg-signal-500 text-white' : 'text-mist-400 hover:text-mist-200'}`}>
            😊 Emoji
          </button>
          <button type="button" onClick={() => setTab('gif')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${tab === 'gif' ? 'bg-signal-500 text-white' : 'text-mist-400 hover:text-mist-200'}`}>
            GIF
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {tab === 'emoji' ? (
          <motion.div key="emoji" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0">
            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto px-2 py-1 grid grid-cols-8 gap-0.5 content-start">
              <EmojiGrid emojis={results} onPick={pickEmoji}
                empty={catId === 'recent' ? 'No recent emoji yet' : 'No matches'} />
            </div>
            {/* Category tab row */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-ink-800 overflow-x-auto no-scrollbar shrink-0">
              <button type="button" onClick={() => { setCatId('recent'); setQuery(''); }}
                className={`shrink-0 p-1.5 rounded-lg cursor-pointer transition-colors ${catId === 'recent' ? 'text-signal-400 bg-signal-700/20' : 'text-mist-500 hover:text-mist-200'}`}>
                <Clock3 size={16} />
              </button>
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => { setCatId(c.id); setQuery(''); }}
                  className={`shrink-0 p-1.5 rounded-lg cursor-pointer transition-colors ${catId === c.id ? 'text-signal-400 bg-signal-700/20' : 'text-mist-500 hover:text-mist-200'}`}
                  title={c.label}>
                  <c.icon size={16} />
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="gif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 min-h-0">
            <GifTab onPick={pickGif} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
