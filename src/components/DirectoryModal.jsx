import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Pin, PinOff, Trash2, RefreshCcw, Edit3,
  Check, Hash, AlertCircle, Clock, ChevronRight,
  Bookmark, Inbox, SortDesc, SortAsc,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { useDirectory } from '../context/DirectoryContext.jsx';
import {
  listPastRooms, forgetRoom, rememberRoom, loadRooms, touchRoom,
} from '../lib/storage.js';
import { api } from '../lib/api.js';
import Spinner from './Spinner.jsx';

/* ── helpers ───────────────────────────────────────────────────── */
function timeAgo(ts) {
  if (!ts) return '—';
  const d = Date.now() - ts, m = Math.floor(d / 60000), h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

/* ── Inline rename ─────────────────────────────────────────────── */
function RenameField({ initial, onSave, onCancel }) {
  const [val, setVal] = useState(initial);
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 30); }, []);
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(val.trim()); if (e.key === 'Escape') onCancel(); }}
        maxLength={40}
        className="flex-1 min-w-0 rounded-lg bg-ink-950 border border-signal-500/50 px-2.5 py-1 text-sm text-mist-100 outline-none"
      />
      <button onClick={() => onSave(val.trim())} className="text-cipher-500 hover:text-cipher-300 cursor-pointer shrink-0"><Check size={14} /></button>
      <button onClick={onCancel} className="text-mist-600 hover:text-mist-300 cursor-pointer shrink-0"><X size={14} /></button>
    </div>
  );
}

/* ── Room row ──────────────────────────────────────────────────── */
function RoomRow({ room, onUpdate, onForget, onJoin }) {
  const [renaming, setRenaming]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [expired, setExpired]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const label = room.label && room.label !== room.roomId ? room.label : null;

  function saveLabel(newLabel) {
    rememberRoom(room.roomId, { label: newLabel || room.roomId });
    onUpdate();
    setRenaming(false);
  }

  function togglePin(e) {
    e.stopPropagation();
    rememberRoom(room.roomId, { pinned: !room.pinned });
    onUpdate();
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (confirmDel) { forgetRoom(room.roomId); onForget(room.roomId); }
    else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 2500); }
  }

  async function handleJoin(e) {
    e.stopPropagation();
    setLoading(true); setExpired(false);
    const r = await onJoin(room, false);
    setLoading(false);
    if (!r.ok && r.code === 'not_found') setExpired(true);
  }

  async function handleRecreate(e) {
    e.stopPropagation();
    setLoading(true);
    const r = await onJoin(room, true);
    setLoading(false);
    if (r.ok) setExpired(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      transition={{ duration: 0.15 }}
      className={`rounded-xl border transition-colors group ${
        room.pinned ? 'border-cipher-700/40 bg-cipher-950/20' : 'border-ink-700/50 bg-ink-800/30'
      } ${expired ? 'border-danger/30' : ''}`}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
          expired ? 'border-danger/30 bg-danger/10' : room.pinned ? 'border-cipher-700/40 bg-cipher-700/10' : 'border-ink-600/50 bg-ink-700/40'
        }`}>
          {expired
            ? <AlertCircle size={13} className="text-danger" />
            : room.pinned
            ? <Pin size={13} className="text-cipher-500" />
            : <Hash size={13} className="text-mist-600" />}
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          {renaming
            ? <RenameField initial={label || room.roomId} onSave={saveLabel} onCancel={() => setRenaming(false)} />
            : (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium text-mist-100 truncate">{label || room.roomId}</span>
                {label && <span className="text-[10px] font-display tracking-wider text-mist-700 shrink-0">{room.roomId}</span>}
                {room.pinned && <span className="text-[9px] uppercase tracking-wider text-cipher-500 border border-cipher-500/30 rounded-full px-1.5 py-0.5 shrink-0">pinned</span>}
              </div>
            )
          }
          <p className="text-[10px] text-mist-600 mt-0.5 flex items-center gap-1.5">
            <Clock size={9} />
            {expired ? <span className="text-danger/70">expired</span> : timeAgo(room.lastActive || room.joinedAt)}
            {room.name && <><span>·</span><span>as {room.name}</span></>}
          </p>
        </div>

        {/* Actions — always visible on mobile, hover on desktop */}
        <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); setRenaming(true); }} className="p-1.5 rounded-lg text-mist-700 hover:text-mist-200 hover:bg-ink-700 transition-colors cursor-pointer" title="Rename"><Edit3 size={12} /></button>
          <button onClick={togglePin} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${room.pinned ? 'text-cipher-500 hover:text-cipher-300' : 'text-mist-700 hover:text-cipher-500'} hover:bg-ink-700`} title={room.pinned ? 'Unpin' : 'Pin'}>{room.pinned ? <Pin size={12} /> : <PinOff size={12} />}</button>
          <button onClick={handleDelete} className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-ink-700 ${confirmDel ? 'text-danger' : 'text-mist-700 hover:text-danger'}`} title={confirmDel ? 'Click again to confirm delete' : 'Delete'}><Trash2 size={12} /></button>
        </div>

        {/* Join button */}
        <button
          onClick={handleJoin}
          disabled={loading}
          className="shrink-0 flex items-center gap-1 rounded-lg bg-signal-500 hover:bg-signal-400 text-ink-950 text-xs font-semibold px-2.5 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? <Spinner size={11} light /> : <><ChevronRight size={12} />Join</>}
        </button>
      </div>

      {/* Expired row */}
      <AnimatePresence>
        {expired && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3.5 pb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-mist-600 flex-1">Room not active — recreate it with the same code.</p>
              <button
                onClick={handleRecreate}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg border border-cipher-500/40 text-cipher-500 text-[11px] font-medium px-2.5 py-1 hover:bg-cipher-700/15 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? <Spinner size={11} /> : <RefreshCcw size={11} />} Recreate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const SORTS = [
  { id: 'recent', label: 'Recent' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name',   label: 'A–Z' },
];

/* ── Main modal ────────────────────────────────────────────────── */
export default function DirectoryModal() {
  const { open, closeDirectory } = useDirectory();
  const navigate  = useNavigate();
  const { notify } = useToast();
  const { profile } = useProfile();

  const [rooms, setRooms]           = useState([]);
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState('recent');
  const [sortAsc, setSortAsc]       = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);
  const searchRef = useRef(null);

  const refresh = useCallback(() => setRooms(listPastRooms()), []);

  useEffect(() => {
    if (open) {
      refresh();
      setTimeout(() => searchRef.current?.focus(), 80);
      // Lock background scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, refresh]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === 'Escape') closeDirectory(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, closeDirectory]);

  const displayed = useMemo(() => {
    let list = [...rooms];
    if (filterPinned) list = list.filter(r => r.pinned);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.roomId.toLowerCase().includes(q) ||
        (r.label || '').toLowerCase().includes(q) ||
        (r.name  || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sort === 'recent') cmp = (b.lastActive || b.joinedAt || 0) - (a.lastActive || a.joinedAt || 0);
      else if (sort === 'oldest') cmp = (a.lastActive || a.joinedAt || 0) - (b.lastActive || b.joinedAt || 0);
      else if (sort === 'name') cmp = (a.label || a.roomId).localeCompare(b.label || b.roomId);
      // pinned always on top regardless of sort
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return sortAsc ? -cmp : cmp;
    });
    return list;
  }, [rooms, search, sort, sortAsc, filterPinned]);

  async function handleJoin(room, recreate = false) {
    const name = room.name || profile?.name || 'Guest';
    if (recreate) {
      try {
        const res = await api.createRoom(name, null, room.roomId);
        rememberRoom(res.roomId, { userId: res.userId, name, label: room.label });
        notify('Room revived — share the code again.', 'success');
        closeDirectory();
        navigate(`/room/${res.roomId}`);
        return { ok: true };
      } catch (err) {
        if (err.code === 'exists') return handleJoin(room, false);
        notify(err.message || 'Could not recreate room.', 'error');
        return { ok: false, code: err.code };
      }
    } else {
      try {
        const res = await api.joinRoom(room.roomId, { name, userId: room.userId });
        rememberRoom(room.roomId, { userId: res.userId, name, label: room.label });
        touchRoom(room.roomId);
        closeDirectory();
        navigate(`/room/${room.roomId}`);
        return { ok: true };
      } catch (err) {
        if (err.code === 'not_found') return { ok: false, code: 'not_found' };
        notify(err.message || 'Could not join room.', 'error');
        return { ok: false, code: err.code };
      }
    }
  }

  const pinnedCount = rooms.filter(r => r.pinned).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm"
            onClick={closeDirectory}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0,  y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
              w-[calc(100vw-32px)] max-w-[560px] max-h-[85vh]
              flex flex-col
              rounded-2xl
              border border-ink-700/80
              bg-ink-900
              shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-ink-700/60 shrink-0">
              <Bookmark size={16} className="text-cipher-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-[11px] tracking-[0.18em] text-mist-300">ROOM DIRECTORY</h2>
                <p className="text-[10px] text-mist-700 mt-0.5">
                  {rooms.length} saved{pinnedCount > 0 ? ` · ${pinnedCount} pinned` : ''} · kept forever
                </p>
              </div>
              <button
                onClick={closeDirectory}
                className="w-7 h-7 rounded-full flex items-center justify-center text-mist-600 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search + filters */}
            <div className="px-4 py-3 border-b border-ink-700/40 shrink-0 flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-700 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search rooms…"
                  className="w-full rounded-xl bg-ink-800/80 border border-ink-700/60 pl-8 pr-8 py-2 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500/50 outline-none transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-600 hover:text-mist-300 cursor-pointer"><X size={12} /></button>
                )}
              </div>

              {/* Pin filter */}
              <button
                onClick={() => setFilterPinned(v => !v)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  filterPinned ? 'border-cipher-500/50 text-cipher-500 bg-cipher-700/10' : 'border-ink-700/60 text-mist-600 hover:text-mist-200 hover:border-ink-600'
                }`}
                title="Show pinned only"
              >
                <Pin size={13} />
              </button>

              {/* Sort cycle */}
              <button
                onClick={() => {
                  const idx = SORTS.findIndex(s => s.id === sort);
                  const next = SORTS[(idx + 1) % SORTS.length];
                  setSort(next.id);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-ink-700/60 px-2.5 py-2 text-[11px] text-mist-600 hover:text-mist-200 hover:border-ink-600 transition-colors cursor-pointer whitespace-nowrap"
                title="Cycle sort order"
              >
                {sortAsc ? <SortAsc size={13} /> : <SortDesc size={13} />}
                <span className="hidden sm:inline">{SORTS.find(s => s.id === sort)?.label}</span>
              </button>

              {/* Flip direction */}
              <button
                onClick={() => setSortAsc(v => !v)}
                className="p-2 rounded-xl border border-ink-700/60 text-mist-600 hover:text-mist-200 hover:border-ink-600 transition-colors cursor-pointer"
                title={sortAsc ? 'Descending' : 'Ascending'}
              >
                {sortAsc ? <SortAsc size={13} /> : <SortDesc size={13} />}
              </button>
            </div>

            {/* Room list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
              <AnimatePresence mode="popLayout">
                {displayed.length > 0
                  ? displayed.map(room => (
                    <RoomRow
                      key={room.roomId}
                      room={room}
                      onUpdate={refresh}
                      onForget={id => setRooms(prev => prev.filter(r => r.roomId !== id))}
                      onJoin={handleJoin}
                    />
                  ))
                  : rooms.length === 0
                  ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center">
                        <Inbox size={20} className="text-mist-700" />
                      </div>
                      <p className="text-sm text-mist-500 font-medium">No rooms yet</p>
                      <p className="text-xs text-mist-700 max-w-xs">Rooms you create or join will be saved here permanently.</p>
                    </motion.div>
                  )
                  : (
                    <motion.div key="no-match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center gap-2 text-center">
                      <Search size={18} className="text-mist-700" />
                      <p className="text-sm text-mist-600">Nothing matches <span className="text-mist-400">"{search}"</span></p>
                      <button onClick={() => { setSearch(''); setFilterPinned(false); }} className="text-xs text-signal-500 hover:text-signal-300 transition-colors cursor-pointer mt-1">Clear filters</button>
                    </motion.div>
                  )
                }
              </AnimatePresence>
            </div>


          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
