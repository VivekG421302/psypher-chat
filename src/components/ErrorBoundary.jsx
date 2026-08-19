import { Component } from 'react';
import { ShieldOff, RefreshCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Psypher] Unhandled render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-ink-950 text-mist-100 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center">
            <ShieldOff size={24} className="text-danger" />
          </div>
          <div>
            <p className="font-display text-sm tracking-widest text-mist-300 mb-2">SOMETHING WENT WRONG</p>
            <p className="text-xs text-mist-600 max-w-xs leading-relaxed font-mono">
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-signal-500 hover:bg-signal-400 text-ink-950 font-semibold text-sm px-5 py-2.5 transition-colors cursor-pointer"
          >
            <RefreshCcw size={15} /> Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
