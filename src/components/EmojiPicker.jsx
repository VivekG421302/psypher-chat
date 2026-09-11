import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
    emojis: '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🎯 🎣 🎽 🛹 🎿 🏆 🥇 🥈 🥉 🎮 🕹️ 🎲 🧩 ♟️ 🎰 🎳 🎨 🎭 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻'.split(' ') },
  { id: 'travel',    label: 'Travel',    icon: Car,
    emojis: '🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚲 🛵 🏍️ ✈️ 🚀 🛸 🚁 ⛵ 🚤 🚂 🗽 🗼 🏰 🏯 🎡 🎢 ⛲ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🏕️ 🏠 🏡 🏢 🌉 🌃 🌌 🎆 🗺️'.split(' ') },
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
function GifTab({ onPick, onSearchFocus, onSearchBlur }) {
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
        aspect:  r.images?.fixed_height_small
          ? Number(r.images.fixed_height_small.width) / Number(r.images.fixed_height_small.height)
          : 1,
      })).filter(r => r.preview && r.full));
    } catch { setError('Could not load GIFs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchGifs('');
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [fetchGifs]);

  const handleSearch = (e) => {
    const val = e.target.value; setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(val), 500);
  };

  // Pinterest masonry — 2 columns, shortest column gets next GIF
  const [col1, col2] = useMemo(() => {
    const c1 = [], c2 = [], h = [0, 0];
    for (const g of gifs) {
      const idx = h[0] <= h[1] ? 0 : 1;
      (idx === 0 ? c1 : c2).push(g);
      h[idx] += 1 / (g.aspect || 1); // taller portrait = more height units
    }
    return [c1, c2];
  }, [gifs]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-ink-800 rounded-full px-3 py-1.5">
          <Search size={13} className="text-mist-600 shrink-0" />
          <input ref={inputRef} value={query} onChange={handleSearch}
            placeholder="Search GIFs, memes…"
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            className="flex-1 bg-transparent text-xs text-mist-100 placeholder:text-mist-600 outline-none min-w-0" />
          {query && (
            <button type="button" onClick={() => { setQuery(''); fetchGifs(''); }}>
              <X size={12} className="text-mist-600 hover:text-mist-300 cursor-pointer" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-24 gap-2 text-mist-600">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}
        {!loading && error && <p className="text-center text-xs text-red-400 py-6">{error}</p>}
        {!loading && !error && gifs.length === 0 && <p className="text-center text-xs text-mist-600 py-6">No GIFs found</p>}
        {!loading && !error && gifs.length > 0 && (
          <div className="flex gap-1.5">
            <div className="flex-1 flex flex-col gap-1.5">
              {col1.map(g => (
                <button key={g.id} type="button" onClick={() => onPick(`[gif]${g.full}`)}
                  className="w-full block rounded-xl overflow-hidden cursor-pointer active:opacity-70 transition-opacity">
                  <img src={g.preview} alt={g.title} className="w-full h-auto block" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {col2.map(g => (
                <button key={g.id} type="button" onClick={() => onPick(`[gif]${g.full}`)}
                  className="w-full block rounded-xl overflow-hidden cursor-pointer active:opacity-70 transition-opacity">
                  <img src={g.preview} alt={g.title} className="w-full h-auto block" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
        {!loading && gifs.length > 0 && (
          <p className="text-center text-[10px] text-mist-700 pt-2">Powered by GIPHY</p>
        )}
      </div>
    </div>
  );
}

// ── Emoji content (shared between mobile sheet and desktop popup) ──────────────
function EmojiContent({ onPick, compact = false, onSearchFocus, onSearchBlur }) {
  const [tab,     setTab]     = useState('emoji');
  const [catId,   setCatId]   = useState('recent');
  const [query,   setQuery]   = useState('');
  const [recents, setRecents] = useState(loadRecents);

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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        {tab === 'emoji' && (
          <div className="flex-1 flex items-center gap-1.5 bg-ink-800 rounded-full px-3 py-1.5 min-w-0">
            <Search size={13} className="text-mist-600 shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              className="flex-1 bg-transparent text-xs text-mist-100 placeholder:text-mist-600 outline-none min-w-0" />
          </div>
        )}
        {tab === 'gif' && <div className="flex-1" />}
        {/* Toggle */}
        <div className="flex items-center bg-ink-800 rounded-full p-0.5 shrink-0">
          <button type="button" onClick={() => setTab('emoji')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${tab === 'emoji' ? 'bg-signal-500 text-white' : 'text-mist-400 hover:text-mist-200'}`}>
            😊
          </button>
          <button type="button" onClick={() => setTab('gif')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${tab === 'gif' ? 'bg-signal-500 text-white' : 'text-mist-400 hover:text-mist-200'}`}>
            GIF
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'emoji' ? (
          <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0">
            <div className={`flex-1 overflow-y-auto px-2 py-1 grid content-start ${compact ? 'grid-cols-7 gap-0.5' : 'grid-cols-8 gap-0.5'}`}>
              {results.length === 0 && (
                <p className="col-span-8 text-center text-xs text-mist-600 py-6">
                  {catId === 'recent' ? 'No recent emoji yet' : 'No matches'}
                </p>
              )}
              {results.map((emoji, i) => (
                <button key={`${emoji}-${i}`} type="button" onClick={() => pickEmoji(emoji)}
                  className="text-xl leading-none aspect-square flex items-center justify-center rounded-xl hover:bg-ink-700 active:scale-90 transition-all cursor-pointer">
                  {emoji}
                </button>
              ))}
            </div>
            {/* Category tabs */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-ink-800 overflow-x-auto no-scrollbar shrink-0">
              <button type="button" onClick={() => { setCatId('recent'); setQuery(''); }}
                className={`shrink-0 p-1.5 rounded-lg cursor-pointer transition-colors ${catId === 'recent' ? 'text-signal-400 bg-signal-700/20' : 'text-mist-500 hover:text-mist-200'}`}>
                <Clock3 size={15} />
              </button>
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => { setCatId(c.id); setQuery(''); }}
                  className={`shrink-0 p-1.5 rounded-lg cursor-pointer transition-colors ${catId === c.id ? 'text-signal-400 bg-signal-700/20' : 'text-mist-500 hover:text-mist-200'}`}
                  title={c.label}>
                  <c.icon size={15} />
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 min-h-0">
            <GifTab onPick={onPick} onSearchFocus={onSearchFocus} onSearchBlur={onSearchBlur} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mobile bottom sheet — portalled to body so parent events don't interfere ──
export function EmojiSheet({ onPick, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    // Slide up after paint
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const handleSearchFocus = () => setExpanded(true);
  const handleSearchBlur  = () => setExpanded(false);

  const content = (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.35)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
        onPointerDown={handleClose}
      />
      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 9999,
          height: expanded ? 'calc(100dvh - 52px)' : '48vh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), height 0.22s cubic-bezier(0.32,0.72,0,1)',
          background: 'var(--color-ink-900, #0f1117)',
          borderTop: '1px solid var(--color-ink-700, #1e2130)',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Handle — tap to close */}
        <div
          style={{
            width: 40, height: 4, borderRadius: 999,
            background: 'var(--color-ink-600, #2a2f45)',
            margin: '10px auto 4px', flexShrink: 0, cursor: 'pointer',
          }}
          onClick={handleClose}
        />
        <EmojiContent
          onPick={onPick}
          onSearchFocus={handleSearchFocus}
          onSearchBlur={handleSearchBlur}
        />
      </div>
    </>
  );

  return createPortal(content, document.body);
}

// ── Desktop floating popup ────────────────────────────────────────────────────
export function EmojiPopup({ onPick, anchorRef }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.14 }}
      className="absolute bottom-full left-0 mb-2 z-50 bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ width: 340, height: 380 }}
      onClick={e => e.stopPropagation()}
    >
      <EmojiContent onPick={onPick} compact />
    </motion.div>
  );
}

// ── Default export: auto-selects sheet vs popup based on screen width ─────────
export default function EmojiPicker({ onPick, onClose, isMobile }) {
  if (isMobile) return <EmojiSheet onPick={onPick} onClose={onClose} />;
  return <EmojiPopup onPick={onPick} />;
}
