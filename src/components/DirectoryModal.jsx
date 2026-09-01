import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Pin, PinOff, Trash2, RefreshCcw, Edit3, Check, Hash, AlertCircle, Bookmark, Clock, User, Search } from 'lucide-react';
import { useToast }     from '../context/ToastContext.jsx';
import { useProfile }   from '../context/ProfileContext.jsx';
import { useDirectory } from '../context/DirectoryContext.jsx';
import { listPastRooms, forgetRoom, rememberRoom, syncFromIdb } from '../lib/storage.js';
import { api }          from '../lib/api.js';
import Spinner          from './Spinner.jsx';

function timeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - ts, m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

function Avatar({ label, pinned }) {
  const letters = (label || '?').slice(0, 2).toUpperCase();
  return (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${
      pinned ? 'bg-cipher-700/30 text-cipher-400 ring-2 ring-cipher-500/40' : 'bg-ink-700 text-mist-400'
    }`}>
      {letters}
    </div>
  );
}

function RenameField({ initial, placeholder, onSave, onCancel }) {
  const [val, setVal] = useState(initial || '');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 30); }, []);
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(val.trim()); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder} maxLength={40}
        className="flex-1 min-w-0 rounded-lg bg-ink-950 border border-signal-500/50 px-2.5 py-1 text-sm text-mist-100 outline-none placeholder:text-mist-700" />
      <button onClick={() => onSave(val.trim())} className="text-cipher-500 hover:text-cipher-300 cursor-pointer shrink-0"><Check size={14} /></button>
      <button onClick={onCancel} className="text-mist-600 hover:text-mist-300 cursor-pointer shrink-0"><X size={14} /></button>
    </div>
  );
}

function RoomRow({ room, onUpdate, onForget, onJoin }) {
  const [renaming,   setRenaming]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [expired,    setExpired]    = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [swiped,     setSwiped]     = useState(false); // swipe-left reveals actions

  const hasLabel = room.label && room.label !== room.roomId;
  const displayName = hasLabel ? room.label : room.roomId;

  function saveLabel(name) {
    rememberRoom(room.roomId, { label: name || room.roomId });
    onUpdate(); setRenaming(false);
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
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`border-b border-ink-800 last:border-0 ${expired ? 'bg-danger/5' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3 active:bg-ink-800/50 transition-colors">
        {/* Avatar circle */}
        <button onClick={handleJoin} disabled={loading} className="shrink-0 cursor-pointer">
          <Avatar label={displayName} pinned={room.pinned} />
        </button>

        {/* Name + meta */}
        <div className="flex-1 min-w-0" onClick={handleJoin}>
          <div className="cursor-pointer">
            {renaming ? (
              <RenameField initial={hasLabel ? room.label : ''} placeholder={room.roomId}
                onSave={saveLabel} onCancel={() => setRenaming(false)} />
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium truncate ${hasLabel ? 'text-mist-100' : 'text-mist-500 font-mono text-xs'}`}>
                    {displayName}
                  </span>
                  {room.pinned && <Pin size={11} className="text-cipher-500 shrink-0" />}
                  {expired && <AlertCircle size={11} className="text-danger shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {hasLabel && <span className="text-[10px] text-mist-700 font-mono">{room.roomId}</span>}
                  {!hasLabel && room.name && <span className="text-[10px] text-mist-600">as {room.name}</span>}
                  {(hasLabel && room.name) && <span className="text-[10px] text-mist-700">· {room.name}</span>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: time + actions */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[10px] text-mist-700">{timeAgo(room.lastActive || room.joinedAt)}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={e => { e.stopPropagation(); setRenaming(true); }}
              className="p-1 rounded-lg text-mist-700 hover:text-mist-300 hover:bg-ink-700 transition-colors cursor-pointer" title="Name">
              <Edit3 size={12} />
            </button>
            <button onClick={togglePin}
              className={`p-1 rounded-lg transition-colors cursor-pointer hover:bg-ink-700 ${room.pinned ? 'text-cipher-500' : 'text-mist-700 hover:text-cipher-500'}`}
              title={room.pinned ? 'Unpin' : 'Pin'}>
              {room.pinned ? <Pin size={12} /> : <PinOff size={12} />}
            </button>
            <button onClick={handleDelete}
              className={`p-1 rounded-lg transition-colors cursor-pointer hover:bg-ink-700 ${confirmDel ? 'text-danger' : 'text-mist-700 hover:text-danger'}`}
              title={confirmDel ? 'Tap again' : 'Remove'}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Join indicator */}
        {loading && <Spinner size={14} />}
      </div>

      {/* Expired prompt */}
      <AnimatePresence>
        {expired && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-mist-600">Room expired — recreate with same code?</p>
              <button onClick={handleRecreate} disabled={loading}
                className="flex items-center gap-1 rounded-lg border border-cipher-500/40 text-cipher-500 text-[11px] px-2.5 py-1 hover:bg-cipher-700/15 cursor-pointer disabled:opacity-50">
                {loading ? <Spinner size={11} /> : <RefreshCcw size={11} />} Recreate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DirectoryModal() {
  const { open, closeDirectory } = useDirectory();
  const navigate    = useNavigate();
  const { notify }  = useToast();
  const { profile } = useProfile();

  const [rooms,  setRooms]  = useState([]);
  const [search, setSearch] = useState('');
  const [tab,    setTab]    = useState('recents'); // 'recents' | 'contacts'
  const searchRef = useRef(null);

  const refresh = useCallback(() => setRooms(listPastRooms()), []);

  useEffect(() => {
    if (!open) return;
    syncFromIdb().then(refresh);
    refresh();
    setTimeout(() => searchRef.current?.focus(), 100);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (e.key === 'Escape') closeDirectory(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, closeDirectory]);

  const filtered = (() => {
    let list = rooms.filter(r => r && typeof r.roomId === 'string');
    // Recents = all, sorted by lastActive. Contacts = named/pinned only.
    if (tab === 'contacts') list = list.filter(r => r.pinned || (r.label && r.label !== r.roomId));
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

  const contactsCount = rooms.filter(r => r.pinned || (r.label && r.label !== r.roomId)).length;

  async function handleJoin(room, recreate = false) {
    const name = room.name || profile?.name || 'Guest';
    if (recreate) {
      try {
        const res = await api.createRoom(name, null, room.roomId);
        rememberRoom(res.roomId, { userId: res.userId, name });
        notify('Room revived.', 'success');
        closeDirectory(); navigate(`/room/${res.roomId}`);
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
        closeDirectory(); navigate(`/room/${room.roomId}`);
        return { ok: true };
      } catch (err) {
        if (err.code === 'not_found') return { ok: false, code: 'not_found' };
        notify(err.message || 'Could not join.', 'error');
        return { ok: false, code: err.code };
      }
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm" style={{ zIndex: 998 }} onClick={closeDirectory} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 'min(calc(100vw - 24px), 480px)', maxHeight: '88vh', pointerEvents: 'auto' }}
          className="flex flex-col rounded-2xl border border-ink-700/80 bg-ink-900 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
            <Bookmark size={16} className="text-cipher-500 shrink-0" />
            <h2 className="font-display text-[11px] tracking-[0.2em] text-mist-200 flex-1">ROOMS</h2>
            <button onClick={closeDirectory} className="w-7 h-7 rounded-full flex items-center justify-center text-mist-600 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
              <X size={15} />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-2 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-700 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search rooms…"
                className="w-full rounded-xl bg-ink-800/60 border border-ink-700/60 pl-8 pr-8 py-2 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500/40 outline-none transition-colors" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-600 hover:text-mist-300 cursor-pointer"><X size={12} /></button>
              )}
            </div>
          </div>

          {/* Tabs — phone style */}
          <div className="flex border-b border-ink-700/60 shrink-0">
            {[
              { id: 'recents',  label: 'Recents',  icon: Clock,  count: rooms.length },
              { id: 'contacts', label: 'Contacts', icon: User,   count: contactsCount },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer border-b-2 ${
                  tab === t.id
                    ? 'border-signal-500 text-signal-400'
                    : 'border-transparent text-mist-600 hover:text-mist-300'
                }`}>
                <t.icon size={13} />
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === t.id ? 'bg-signal-500/20 text-signal-400' : 'bg-ink-700 text-mist-600'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <AnimatePresence mode="popLayout">
              {filtered.length > 0
                ? filtered.map(room => (
                  <RoomRow key={room.roomId} room={room}
                    onUpdate={refresh}
                    onForget={id => setRooms(prev => prev.filter(r => r.roomId !== id))}
                    onJoin={handleJoin} />
                ))
                : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-16 flex flex-col items-center gap-3 text-center px-6">
                    {tab === 'contacts' ? (
                      <>
                        <User size={24} className="text-mist-700" />
                        <p className="text-sm text-mist-500 font-medium">No contacts yet</p>
                        <p className="text-xs text-mist-700">Pin a room or give it a name to save it as a contact.</p>
                      </>
                    ) : (
                      <>
                        <Clock size={24} className="text-mist-700" />
                        <p className="text-sm text-mist-500 font-medium">{search ? `No results for "${search}"` : 'No recent rooms'}</p>
                        <p className="text-xs text-mist-700">{search ? '' : 'Rooms you join will appear here automatically.'}</p>
                      </>
                    )}
                  </motion.div>
                )
              }
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-ink-700/40 shrink-0 flex items-center justify-between">
            <p className="text-[10px] text-mist-700">{rooms.length} room{rooms.length !== 1 ? 's' : ''} · on this device</p>
            <p className="text-[10px] text-mist-700">Tap avatar to join</p>
          </div>
        </div>
      </div>
    </>
  );
}
