import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import DecryptText from '../components/DecryptText.jsx';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
      <ShieldAlert size={32} className="text-signal-500" />
      <h1 className="font-display text-2xl text-mist-100">
        <DecryptText text="404 — NOTHING HERE" />
      </h1>
      <p className="text-mist-500 max-w-sm text-sm">
        Either this page never existed, or it expired like every room eventually does.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-signal-500 text-ink-950 text-sm font-semibold px-4 py-2 hover:bg-signal-300 transition-colors"
      >
        Back to start
      </Link>
    </div>
  );
}
