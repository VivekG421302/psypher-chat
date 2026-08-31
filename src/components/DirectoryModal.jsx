/**
 * DirectoryModal — "Saved Rooms"
 *
 * Think of it like phone contacts.
 * - Every room you join is automatically saved here.
 * - If you haven't named it, it shows the room code (like an unsaved number).
 * - Tap the pencil to give it a name.
 * - Pin important rooms so they float to the top.
 * - Tap Join to jump straight back in.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Pin, PinOff, Trash2, RefreshCcw, Edit3,
  Check, Hash, AlertCircle, Bookmark,
} from 'lucide-react';
import { useToast }      from '../context/ToastContext.jsx';
import { useProfile }    from '../context/ProfileContext.jsx';
import { useDirectory }  from '../context/DirectoryContext.jsx';
import { listPastRooms, forgetRoom, rememberRoom, loadRooms, syncFromIdb } from '../lib/storage.js';
import { api }           from '../lib/api.js';
import Spinner           from './Spinner.jsx';

function timeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

/* ── Inline rename field ───────────────────────────────────────── */
function RenameField({ initial, placeholder, onSave, onCancel }) {
  const [val, setVal] = useState(initial || '');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 30); }, []);
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(val.trim());
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        maxLength={40}
        className="flex-1 min-w-0 rounded-lg bg-ink-950 border border-signal-500/50 px-2.5 py-1 text-sm text-mist-100 outline-none placeholder:text-mist-700"
      />
      <button onClick={() => onSave(val.trim())} className="text-cipher-500 hover:text-cipher-300 cursor-pointer shrink-0" aria-label="Save"><Check size={14} /></button>
      <button onClick={onCancel} className="text-mist-600 hover:text-mist-300 cursor-pointer shrink-0" aria-label="Cancel"><X size={14} /></button>
    </div>
  );
}

/* ── Single room row ───────────────────────────────────────────── */
function RoomRow({ room, onUpdate, onForget, onJoin }) {
  const [renaming,   setRenaming]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [expired,    setExpired]    = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const hasLabel = room.label && room.label !== room.roomId;

  function saveLabel(name) {
    rememberRoom(room.roomId, { label: name || room.roomId });
    onUpdate();
    setRenaming(false);
  }

  function togglePin(e) {
    e.stopPropagation();
    rememberRoom(room.roomId, { pinned: !room.pinned });
    onUpdate();
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

  function handleDelete(e) {
    e.stopPropagation();
    if (confirmDel) { forgetRoom(room.roomId); onForget(room.roomId); }
    else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 2500); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      transition={{ duration: 0.14 }}
      className={`rounded-xl border transition-colors ${
        room.pinned
          ? 'border-cipher-700/50 bg-cipher-950/20'
          : expired
          ? 'border-danger/30 bg-danger/5'
          : 'border-ink-700/50 bg-ink-800/30'
      }`}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">

        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 text-xs font-display tracking-wider ${
          room.pinned ? 'border-cipher-700/50 bg-cipher-700/10 text-cipher-500'
            : expired ? 'border-danger/30 bg-danger/10 text-danger'
            : 'border-ink-600/50 bg-ink-700/30 text-mist-600'
        }`}>
          {expired ? <AlertCircle size={15} /> : room.pinned ? <Pin size={14} /> : <Hash size={14} />}
        </div>

        {/* Name / rename */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <RenameField
              initial={hasLabel ? room.label : ''}
              placeholder={room.roomId}
              onSave={saveLabel}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Name (or room code if unnamed) */}
                <span className={`text-sm font-medium truncate ${hasLabel ? 'text-mist-100' : 'text-mist-500 font-mono'}`}>
                  {hasLabel ? room.label : room.roomId}
                </span>
                {/* Show room code as subtitle when a label exists */}
                {hasLabel && (
                  <span className="text-[10px] text-mist-700 font-mono shrink-0">{room.roomId}</span>
                )}
                {room.pinned && (
                  <span className="text-[9px] uppercase tracking-wider text-cipher-500 border border-cipher-500/30 rounded-full px-1.5 py-0.5 shrink-0">saved</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-mist-700">{timeAgo(room.lastActive || room.joinedAt)}</span>
                {room.name && <span className="text-[10px] text-mist-700">· as {room.name}</span>}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!renaming && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={e => { e.stopPropagation(); setRenaming(true); }}
              className="p-1.5 rounded-lg text-mist-600 hover:text-mist-200 hover:bg-ink-700 transition-colors cursor-pointer" title="Name this room">
              <Edit3 size={13} />
            </button>
            <button onClick={togglePin}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-ink-700 ${room.pinned ? 'text-cipher-500' : 'text-mist-600 hover:text-cipher-500'}`}
              title={room.pinned ? 'Unpin' : 'Save / Pin'}>
              {room.pinned ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
            <button onClick={handleDelete}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-ink-700 ${confirmDel ? 'text-danger' : 'text-mist-700 hover:text-danger'}`}
              title={confirmDel ? 'Tap again to remove' : 'Remove'}>
              <Trash2 size={13} />
            </button>
            <button onClick={handleJoin} disabled={loading}
              className="ml-1 flex items-center gap-1 rounded-lg bg-signal-500 hover:bg-signal-400 text-ink-950 text-xs font-bold px-2.5 py-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0">
              {loading ? <Spinner size={11} light /> : 'Join'}
            </button>
          </div>
        )}
      </div>

      {/* Expired inline prompt */}
      <AnimatePresence>
        {expired && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3.5 pb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-mist-600 flex-1">This room expired. Recreate it with the same code?</p>
              <button onClick={handleRecreate} disabled={loading}
                className="flex items-center gap-1 rounded-lg border border-cipher-500/40 text-cipher-500 text-[11px] font-medium px-2.5 py-1 hover:bg-cipher-700/15 transition-colors cursor-pointer disabled:opacity-50">
                {loading ? <Spinner size={11} /> : <RefreshCcw size={11} />} Recreate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main modal ────────────────────────────────────────────────── */
export default function DirectoryModal() {
  const { open, closeDirectory } = useDirectory();
  const navigate   = useNavigate();
  const { notify } = useToast();
  const { profile }= useProfile();

  const [rooms,  setRooms]  = useState([]);
  const [search, setSearch] = useState('');
  const [tab,    setTab]    = useState('all'); // 'all' | 'saved'
  const searchRef = useRef(null);

  const refresh = useCallback(() => setRooms(listPastRooms()), []);

  useEffect(() => {
    if (!open) return;
    syncFromIdb().then(refresh); // merge IDB → LS then show
    refresh();
    setTimeout(() => searchRef.current?.focus(), 80);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (e.key === 'Escape') closeDirectory(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, closeDirectory]);

  // Filter
  const displayed = (() => {
    let list = rooms.filter(r => r && typeof r.roomId === 'string');
    if (tab === 'saved') list = list.filter(r => r.pinned);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.roomId.toLowerCase().includes(q) ||
        (r.label || '').toLowerCase().includes(q) ||
        (r.name  || '').toLowerCase().includes(q)
      );
    }
    return list;
  })();

  async function handleJoin(room, recreate = false) {
    const name = room.name || profile?.name || 'Guest';
    if (recreate) {
      try {
        const res = await api.createRoom(name, null, room.roomId);
        rememberRoom(res.roomId, { userId: res.userId, name });
        notify('Room revived.', 'success');
        closeDirectory();
        navigate(`/room/${res.roomId}`);
        return { ok: true };
      } catch (err) {
        if (err.code === 'exists') return handleJoin(room, false);
        notify(err.message || 'Could not recreate.', 'error');
        return { ok: false, code: err.code };
      }
    } else {
      try {
        const res = await api.joinRoom(room.roomId, { name, userId: room.userId });
        rememberRoom(room.roomId, { userId: res.userId, name });
        closeDirectory();
        navigate(`/room/${room.roomId}`);
        return { ok: true };
      } catch (err) {
        if (err.code === 'not_found') return { ok: false, code: 'not_found' };
        notify(err.message || 'Could not join.', 'error');
        return { ok: false, code: err.code };
      }
    }
  }

  const savedCount = rooms.filter(r => r.pinned).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm"
        style={{ zIndex: 998 }}
        onClick={closeDirectory}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{ width: 'min(calc(100vw - 32px), 520px)', maxHeight: '82vh', pointerEvents: 'auto' }}
          className="flex flex-col rounded-2xl border border-ink-700/80 bg-ink-900 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-ink-700/50 shrink-0">
            <Bookmark size={15} className="text-cipher-500 shrink-0" />
            <div className="flex-1">
              <h2 className="font-display text-[11px] tracking-[0.18em] text-mist-300">SAVED ROOMS</h2>
              <p className="text-[10px] text-mist-700 mt-0.5">
                {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                {savedCount > 0 ? ` · ${savedCount} pinned` : ''}
                {' · stored on this device'}
              </p>
            </div>
            <button onClick={closeDirectory}
              className="w-7 h-7 rounded-full flex items-center justify-center text-mist-600 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
              <X size={15} />
            </button>
          </div>

          {/* Tabs + Search */}
          <div className="px-4 pt-3 pb-2 shrink-0 space-y-2.5">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-ink-800/60 rounded-xl p-1">
              {[
                { id: 'all',   label: `All (${rooms.length})` },
                { id: 'saved', label: `Pinned (${savedCount})` },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 text-xs font-medium rounded-lg py-1.5 transition-colors cursor-pointer ${
                    tab === t.id ? 'bg-signal-500 text-ink-950' : 'text-mist-500 hover:text-mist-100'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-700 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or room code…"
                className="w-full rounded-xl bg-ink-800/80 border border-ink-700/60 pl-8 pr-8 py-2 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500/50 outline-none transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-600 hover:text-mist-300 cursor-pointer">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
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
                : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-16 flex flex-col items-center gap-3 text-center">
                    {tab === 'saved' ? (
                      <>
                        <Pin size={22} className="text-mist-700" />
                        <p className="text-sm text-mist-500">No pinned rooms yet</p>
                        <p className="text-xs text-mist-700">Pin rooms you want to keep easy access to.</p>
                      </>
                    ) : rooms.length === 0 ? (
                      <>
                        <Hash size={22} className="text-mist-700" />
                        <p className="text-sm text-mist-500">No rooms saved yet</p>
                        <p className="text-xs text-mist-700">Rooms you join will automatically appear here.</p>
                      </>
                    ) : (
                      <>
                        <Search size={18} className="text-mist-700" />
                        <p className="text-sm text-mist-600">No results for <span className="text-mist-400">"{search}"</span></p>
                        <button onClick={() => setSearch('')}
                          className="text-xs text-signal-500 hover:text-signal-300 transition-colors cursor-pointer">
                          Clear search
                        </button>
                      </>
                    )}
                  </motion.div>
                )
              }
            </AnimatePresence>
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-ink-700/40 shrink-0">
            <p className="text-[10px] text-mist-700 text-center">
              Tap <Pin size={10} className="inline" /> to pin · tap name to rename · stored in IndexedDB on this device
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
