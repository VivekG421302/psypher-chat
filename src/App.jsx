import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { BookMarked, ShieldCheck } from 'lucide-react';
import Landing from './pages/Landing.jsx';
import Room from './pages/Room.jsx';
import Directory from './pages/Directory.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * Persistent sidebar — always visible alongside the main content.
 * On mobile it collapses to an icon-only bottom tab bar.
 */
function Sidebar() {
  const location = useLocation();
  const inRoom = location.pathname.startsWith('/room/');

  // Hide sidebar entirely when inside a room (full-screen chat)
  if (inRoom) return null;

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-ink-700 bg-ink-900 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-ink-700">
          <ShieldCheck size={16} className="text-signal-500 shrink-0" />
          <span className="font-display text-[11px] tracking-[0.2em] text-mist-400">PSYPHER</span>
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-signal-500/10 text-signal-400 border border-signal-500/20'
                  : 'text-mist-500 hover:text-mist-100 hover:bg-ink-800'
              }`
            }
          >
            <ShieldCheck size={16} />
            Home
          </NavLink>

          <NavLink
            to="/directory"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-cipher-500/10 text-cipher-400 border border-cipher-500/20'
                  : 'text-mist-500 hover:text-mist-100 hover:bg-ink-800'
              }`
            }
          >
            <BookMarked size={16} />
            Directory
          </NavLink>
        </nav>

        <div className="px-3 pb-4 text-[10px] text-mist-700">
          Rooms saved locally · never expire
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-ink-700 bg-ink-900/95 backdrop-blur">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-signal-400' : 'text-mist-600'
            }`
          }
        >
          <ShieldCheck size={18} />
          Home
        </NavLink>
        <NavLink
          to="/directory"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-cipher-400' : 'text-mist-600'
            }`
          }
        >
          <BookMarked size={18} />
          Directory
        </NavLink>
      </nav>
    </>
  );
}

export default function App() {
  const location = useLocation();
  const inRoom = location.pathname.startsWith('/room/');

  return (
    <div className={`min-h-screen bg-ink-950 text-mist-100 bg-noise ${inRoom ? '' : 'md:flex'}`}>
      <Sidebar />

      {/* Main content — add bottom padding on mobile for tab bar (except in rooms) */}
      <main className={`flex-1 min-w-0 ${!inRoom ? 'pb-16 md:pb-0' : ''}`}>
        <Routes>
          <Route path="/"            element={<Landing />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/directory"   element={<Directory />} />
          <Route path="*"            element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
