import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Room from './pages/Room.jsx';
import Directory from './pages/Directory.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 bg-noise">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
