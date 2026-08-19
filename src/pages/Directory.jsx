import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Pin, PinOff, Trash2, RefreshCcw, Edit3,
  Check, X, Hash, AlertCircle, Clock, BookMarked, ChevronRight,
  SortAsc, SortDesc, ShieldCheck, Inbox,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import {
  listPastRooms, forgetRoom, rememberRoom, loadRooms, touchRoom,
} from '../lib/storage.js';
import { api } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';

/* ─── helpers ─────────────────────────────────────────────────── */
function timeAgo(ts) {
  if (!ts) return 'unknown';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function fullDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─── Inline rename field ─────────────────────────────────────── */
function RenameField({ initial, onSave, onCancel }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(val.trim());
          if (e.key === 'Escape') onCancel();
        }}
        maxLength={40}
        className="flex-1 min-w-0 rounded-lg bg-ink-900 border border-signal-500/60 px-2 py-1 text-sm text-mist-100 outline-none"
      />
      <button onClick={() => onSave(val.trim())} className="text-cipher-500 hover:text-cipher-300 cursor-pointer" aria-label="Save">
        <Check size={14} />
      </button>
      <button onClick={onCancel} className="text-mist-600 hover:text-mist-300 cursor-pointer" aria-label="Cancel">
        <X size={14} />
      </button>
    </div>
  );
}

/* ─── Single room card ────────────────────────────────────────── */
function RoomCard({ room, onUpdate, onForget, onRejoin, onRecreate }) {
  const [renaming, setRenaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const label = room.label && room.label !== room.roomId ? room.label : null;

  function saveLabel(newLabel) {
    const rooms = loadRooms();
    const updated = { ...rooms[room.roomId], label: newLabel || room.roomId };
    rememberRoom(room.roomId, updated);
    onUpdate();
    setRenaming(false);
  }

  function togglePin(e) {
    e.stopPropagation();
    const rooms = loadRooms();
    const updated = { ...rooms[room.roomId], pinned: !room.pinned };
    rememberRoom(room.roomId, updated);
    onUpdate();
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (confirmDelete) {
      forgetRoom(room.roomId);
      onForget(room.roomId);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  }

  async function handleJoin(e) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setExpired(false);
    const result = await onRejoin(room);
    setLoading(false);
    if (!result.ok && result.code === 'not_found') setExpired(true);
  }

  async function handleRecreate(e) {
    e.stopPropagation();
    setLoading(true);
    const result = await onRecreate(room);
    setLoading(false);
    if (result.ok) setExpired(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      className={`rounded-2xl border bg-ink-800/50 overflow-hidden transition-colors ${
        room.pinned ? 'border-cipher-700/50' : expired ? 'border-danger/30' : 'border-ink-700/60'
      }`}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <div className={`mt-0.5 w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
          room.pinned
            ? 'bg-cipher-700/15 border-cipher-700/40'
            : expired
            ? 'bg-danger/10 border-danger/30'
            : 'bg-ink-700/60 border-ink-600/60'
        }`}>
          {expired
            ? <AlertCircle size={15} className="text-danger" />
            : room.pinned
            ? <Pin size={15} className="text-cipher-500" />
            : <Hash size={15} className="text-mist-500" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <RenameField
              initial={label || room.roomId}
              onSave={saveLabel}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-mist-100 truncate">
                {label || room.roomId}
              </span>
              {label && (
                <span className="text-[10px] font-display tracking-wider text-mist-600 shrink-0">
                  {room.roomId}
                </span>
              )}
              {room.pinned && (
                <span className="text-[9px] uppercase tracking-wider text-cipher-500 border border-cipher-500/40 rounded-full px-1.5 py-0.5 shrink-0">
                  Pinned
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="text-[11px] text-mist-600 flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(room.lastActive || room.joinedAt)}
            </span>
            <span className="text-[11px] text-mist-700" title={fullDate(room.joinedAt)}>
              Joined {fullDate(room.joinedAt)}
            </span>
            {room.name && (
              <span className="text-[11px] text-mist-600">
                as <span className="text-mist-400">{room.name}</span>
              </span>
            )}
          </div>

          {expired && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 flex items-center gap-2 flex-wrap"
            >
              <p className="text-[11px] text-danger/80 flex-1">
                This room is no longer active.
              </p>
              <button
                onClick={handleRecreate}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg border border-cipher-500/50 text-cipher-500 text-[11px] font-medium px-2.5 py-1 hover:bg-cipher-700/15 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? <Spinner size={11} /> : <RefreshCcw size={11} />}
                Recreate room
              </button>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {/* Rename */}
          <button
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            className="p-1.5 rounded-lg text-mist-600 hover:text-mist-200 hover:bg-ink-700 transition-colors cursor-pointer"
            title="Rename"
          >
            <Edit3 size={13} />
          </button>

          {/* Pin / unpin */}
          <button
            onClick={togglePin}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              room.pinned
                ? 'text-cipher-500 hover:text-cipher-300 hover:bg-ink-700'
                : 'text-mist-600 hover:text-cipher-500 hover:bg-ink-700'
            }`}
            title={room.pinned ? 'Unpin' : 'Pin room'}
          >
            {room.pinned ? <Pin size={13} /> : <PinOff size={13} />}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              confirmDelete
                ? 'text-danger bg-danger/15'
                : 'text-mist-600 hover:text-danger hover:bg-ink-700'
            }`}
            title={confirmDelete ? 'Permanently delete — cannot be undone' : 'Delete room from directory'}
          >
            <Trash2 size={13} />
          </button>

          {/* Join */}
          <button
            onClick={handleJoin}
            disabled={loading}
            className="flex items-center gap-1.5 ml-1 rounded-xl bg-signal-500 hover:bg-signal-400 disabled:opacity-50 text-ink-950 text-xs font-semibold px-3 py-1.5 transition-colors cursor-pointer"
          >
            {loading ? <Spinner size={12} light /> : <><ChevronRight size={13} /> Join</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Sort options ────────────────────────────────────────────── */
const SORTS = [
  { id: 'recent',  label: 'Recent first' },
  { id: 'oldest',  label: 'Oldest first' },
  { id: 'name',    label: 'Name A–Z' },
  { id: 'pinned',  label: 'Pinned first' },
];

/* ─── Main Directory page ─────────────────────────────────────── */
export default function Directory() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { profile } = useProfile();

  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const refresh = useCallback(() => setRooms(listPastRooms()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleForget(roomId) {
    setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
  }

  // ── filtered + sorted list ──────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...rooms];

    if (filterPinned) list = list.filter((r) => r.pinned);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        r.roomId.toLowerCase().includes(q) ||
        (r.label || '').toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sort === 'recent') cmp = (b.lastActive || b.joinedAt || 0) - (a.lastActive || a.joinedAt || 0);
      else if (sort === 'oldest') cmp = (a.lastActive || a.joinedAt || 0) - (b.lastActive || b.joinedAt || 0);
      else if (sort === 'name') cmp = (a.label || a.roomId).localeCompare(b.label || b.roomId);
      else if (sort === 'pinned') {
        if (a.pinned && !b.pinned) cmp = -1;
        else if (!a.pinned && b.pinned) cmp = 1;
        else cmp = (b.lastActive || b.joinedAt || 0) - (a.lastActive || a.joinedAt || 0);
      }
      return sortAsc ? -cmp : cmp;
    });

    return list;
  }, [rooms, search, sort, sortAsc, filterPinned]);

  const pinnedCount = useMemo(() => rooms.filter((r) => r.pinned).length, [rooms]);

  // ── rejoin / recreate ───────────────────────────────────────────
  async function handleRejoin(room) {
    const displayName = room.name || profile?.name || 'Guest';
    try {
      const res = await api.joinRoom(room.roomId, { name: displayName, userId: room.userId });
      rememberRoom(room.roomId, { userId: res.userId, name: displayName, label: room.label });
      touchRoom(room.roomId);
      navigate(`/room/${room.roomId}`);
      return { ok: true };
    } catch (err) {
      if (err.code === 'not_found') return { ok: false, code: 'not_found' };
      notify(err.message || 'Could not rejoin that room.', 'error');
      return { ok: false, code: err.code || 'error' };
    }
  }

  async function handleRecreate(room) {
    const displayName = room.name || profile?.name || 'Guest';
    try {
      const res = await api.createRoom(displayName, null, room.roomId);
      rememberRoom(res.roomId, { userId: res.userId, name: displayName, label: room.label || `My room · ${res.roomId}` });
      notify('Room revived — share the code again.', 'success');
      navigate(`/room/${res.roomId}`);
      return { ok: true };
    } catch (err) {
      if (err.code === 'exists') {
        notify('Room is already active — rejoining…', 'info');
        return handleRejoin(room);
      }
      notify(err.message || 'Could not recreate this room.', 'error');
      return { ok: false, code: err.code || 'error' };
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-900/90 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookMarked size={16} className="text-cipher-500 shrink-0" />
          <h1 className="font-display text-sm tracking-widest text-mist-100 truncate">
            ROOM DIRECTORY
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-mist-600">
          <span>{rooms.length} saved</span>
          {pinnedCount > 0 && <span>· {pinnedCount} pinned</span>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Search + filter bar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-600 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="w-full rounded-xl bg-ink-800 border border-ink-700 pl-8 pr-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500/60 outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-600 hover:text-mist-300 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Pinned filter */}
          <button
            onClick={() => setFilterPinned((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              filterPinned
                ? 'border-cipher-500/60 text-cipher-500 bg-cipher-700/10'
                : 'border-ink-700 text-mist-500 hover:border-cipher-500/40 hover:text-mist-200'
            }`}
          >
            <Pin size={13} />
            <span className="hidden sm:inline">Pinned</span>
          </button>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3 py-2.5 text-xs font-medium text-mist-500 hover:border-signal-500/40 hover:text-mist-200 transition-colors cursor-pointer"
              title="Sort"
            >
              {sortAsc ? <SortAsc size={14} /> : <SortDesc size={14} />}
              <span className="hidden sm:inline">{SORTS.find((s) => s.id === sort)?.label}</span>
            </button>

            <AnimatePresence>
              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute right-0 top-full mt-1.5 z-20 min-w-[160px] rounded-xl border border-ink-700 bg-ink-800 shadow-xl overflow-hidden"
                  >
                    {SORTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (sort === s.id) setSortAsc((v) => !v);
                          else { setSort(s.id); setSortAsc(false); }
                          setSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          sort === s.id
                            ? 'text-signal-500 bg-signal-700/10'
                            : 'text-mist-400 hover:text-mist-100 hover:bg-ink-700'
                        }`}
                      >
                        {s.label}
                        {sort === s.id && (sortAsc ? <SortAsc size={12} /> : <SortDesc size={12} />)}
                      </button>
                    ))}
                    <div className="border-t border-ink-700" />
                    <button
                      onClick={() => { setSortAsc((v) => !v); setSortMenuOpen(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-mist-500 hover:text-mist-200 hover:bg-ink-700 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      {sortAsc ? <SortAsc size={12} /> : <SortDesc size={12} />}
                      Reverse order
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stats strip */}
        {rooms.length > 0 && (
          <div className="flex items-center justify-between text-[11px] text-mist-700 px-0.5">
            <span>
              {displayed.length === rooms.length
                ? `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`
                : `${displayed.length} of ${rooms.length} rooms`}
              {filterPinned && ' · pinned only'}
            </span>
            <span className="text-mist-800 italic">Rooms are kept forever</span>
          </div>
        )}

        {/* Room list */}
        <AnimatePresence mode="popLayout">
          {displayed.length > 0 ? (
            displayed.map((room) => (
              <RoomCard
                key={room.roomId}
                room={room}
                onUpdate={refresh}
                onForget={handleForget}
                onRejoin={handleRejoin}
                onRecreate={handleRecreate}
              />
            ))
          ) : rooms.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center">
                <Inbox size={22} className="text-mist-700" />
              </div>
              <div>
                <p className="text-sm text-mist-400 font-medium mb-1">No rooms saved yet</p>
                <p className="text-xs text-mist-700 max-w-xs">
                  Rooms you join or create will appear here. You can pin, rename, and rejoin them any time.
                </p>
              </div>
              <Link
                to="/"
                className="mt-2 rounded-xl bg-signal-500 hover:bg-signal-400 text-ink-950 font-semibold text-sm px-5 py-2.5 transition-colors"
              >
                Start a room
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 flex flex-col items-center gap-3 text-center"
            >
              <Search size={20} className="text-mist-700" />
              <p className="text-sm text-mist-500">
                No rooms match <span className="text-mist-300">"{search}"</span>
              </p>
              <button
                onClick={() => { setSearch(''); setFilterPinned(false); }}
                className="text-xs text-signal-500 hover:text-signal-300 transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
