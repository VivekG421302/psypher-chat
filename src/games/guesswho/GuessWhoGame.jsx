import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw, BookOpen, X, MessageSquare, Send, Flag, Smile,
  Target, HelpCircle, Check, ChevronDown, Sparkles, AlertTriangle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CharacterAvatar from './CharacterAvatar.jsx';
import { TRAITS } from './characters.js';
import { useGuessWho } from './useGuessWho.js';
import QuickReactBar from '../../components/QuickReactBar.jsx';

/* ── Shared arcade modal wrapper ───────────────────────────────── */
function Modal({ onClose, children, zClass = 'z-[60]' }) {
  return (
    <div className={`fixed inset-0 ${zClass} bg-black/80 flex items-center justify-center p-4`} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── Rules ─────────────────────────────────────────────────────── */
function RulesModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
        <p className="font-display text-[11px] tracking-widest text-signal-500">GUESS WHO? · RULES</p>
        <button onClick={onClose} className="text-mist-600 hover:text-mist-100 cursor-pointer"><X size={14} /></button>
      </div>
      <div className="overflow-y-auto max-h-[65vh] p-4 space-y-4 text-[11.5px] text-mist-400 leading-relaxed">
        <RS t="🎯 Objective">You're each secretly assigned a character. First to correctly name the opponent's character wins.</RS>
        <RS t="▶️ Your turn">Ask a yes/no question — it's answered automatically. Non-matching characters get crossed off.</RS>
        <RS t="🕵️ Accusation">Skip questions and accuse directly. Correct = instant win. Wrong = turn forfeit.</RS>
        <RS t="🏆 Winning">First correct accusation wins the round.</RS>
      </div>
    </Modal>
  );
}
function RS({ t, children }) {
  return <div><p className="text-mist-200 font-semibold mb-1">{t}</p><p>{children}</p></div>;
}

/* ── Surrender ─────────────────────────────────────────────────── */
function SurrenderModal({ onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div className="p-5 text-center">
        <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-center mx-auto mb-3">
          <Flag size={18} className="text-danger" />
        </div>
        <p className="text-sm text-mist-100 font-medium mb-1">Surrender?</p>
        <p className="text-xs text-mist-500 mb-4">The round restarts with fresh secrets.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-200 cursor-pointer transition-colors">Keep playing</button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">Surrender</button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Accuse confirm ─────────────────────────────────────────────── */
function AccuseModal({ character, onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div className="p-5 text-center">
        <div className="w-16 h-16 rounded-xl bg-ink-800 border border-ink-600 mx-auto mb-3 flex items-center justify-center overflow-hidden">
          <CharacterAvatar character={character} size={56} />
        </div>
        <p className="text-sm text-mist-100 font-medium mb-1">
          Accuse <span className="text-signal-500">{character.name}</span>?
        </p>
        <p className="text-xs text-mist-500 mb-4">Correct = win instantly. Wrong = lose your turn.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-200 cursor-pointer transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-signal-500 hover:bg-signal-300 py-2 text-ink-950 font-semibold cursor-pointer transition-colors">Accuse</button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Question picker ────────────────────────────────────────────── */
function QuestionPicker({ disabled, askedQuestions, onAsk }) {
  const [open, setOpen] = useState(null);
  const asked = new Set(askedQuestions.map(q => `${q.traitKey}:${q.value}`));

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-800/30 p-2.5">
      <p className="text-[10px] text-mist-600 mb-2 flex items-center gap-1">
        <HelpCircle size={11} /> Ask a yes/no question
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TRAITS.map(trait => (
          <div key={trait.key} className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpen(t => t === trait.key ? null : trait.key)}
              className={`flex items-center gap-1 text-[11px] rounded-lg border px-2 py-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:cursor-pointer ${
                open === trait.key
                  ? 'border-signal-500/70 text-signal-400 bg-signal-700/10'
                  : 'border-ink-600 text-mist-400 hover:border-ink-500 hover:text-mist-200'
              }`}
            >
              {trait.label} <ChevronDown size={10} className={`transition-transform ${open === trait.key ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {open === trait.key && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute z-30 top-full mt-1 left-0 rounded-xl border border-ink-600 bg-ink-800 shadow-2xl p-1.5 min-w-[9rem]"
                >
                  {(trait.type === 'boolean' ? [true] : trait.values).map(value => {
                    const key = `${trait.key}:${value}`;
                    const already = asked.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { onAsk(trait.key, value); setOpen(null); }}
                        className={`w-full text-left text-[11px] rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          already ? 'text-mist-700 hover:bg-ink-700/30' : 'text-mist-200 hover:bg-ink-700'
                        }`}
                      >
                        <span>{trait.type === 'boolean' ? trait.question(value) : value[0].toUpperCase() + value.slice(1)}</span>
                        {already && <Check size={10} className="text-mist-700 shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Character tile ─────────────────────────────────────────────── */
function CharTile({ character, eliminated, accuseMode, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all cursor-pointer ${
        eliminated
          ? 'border-ink-800 bg-ink-900/40 opacity-25 grayscale pointer-events-auto'
          : accuseMode
          ? 'border-signal-500/60 bg-ink-800/80 hover:border-signal-400 hover:bg-signal-900/20 hover:-translate-y-0.5'
          : 'border-ink-700/60 bg-ink-800/60 hover:border-ink-500 hover:bg-ink-700/60 hover:-translate-y-0.5'
      }`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
        <CharacterAvatar character={character} size={38} />
      </div>
      <span className={`text-[8px] leading-none truncate max-w-full font-display tracking-wide ${eliminated ? 'text-mist-800' : 'text-mist-400'}`}>
        {character.name.toUpperCase()}
      </span>
      {eliminated && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px bg-danger/50 rotate-[-15deg]" />
        </div>
      )}
      {accuseMode && !eliminated && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-signal-500 border border-ink-900" />
      )}
    </button>
  );
}

/* ── Floating bubbles ───────────────────────────────────────────── */
function FloatingBubbles({ bubbles }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {bubbles.map(b => (
          <motion.div key={b.uid}
            initial={{ opacity: 0, y: 0, scale: 0.85 }}
            animate={{ opacity: 1, y: -55, scale: 1 }}
            exit={{ opacity: 0, y: -110, scale: 0.8 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="absolute"
            style={{ bottom: '5rem', left: `${b.x}%`, transform: 'translateX(-50%)' }}>
            <div className="rounded-xl rounded-bl-sm bg-ink-700/95 border border-ink-600 px-3 py-1.5 max-w-[160px] shadow-lg">
              <p className="text-[10px] text-mist-600 mb-0.5">{b.name}</p>
              <p className="text-xs text-mist-100 break-words">{b.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Inline chat ────────────────────────────────────────────────── */
function InlineChat({ onSend }) {
  const [v, setV] = useState('');
  function submit(e) { e.preventDefault(); if (!v.trim()) return; onSend(v.trim()); setV(''); }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2 border-t border-ink-700/60 bg-ink-950 shrink-0">
      <MessageSquare size={12} className="text-mist-700 shrink-0" />
      <input value={v} onChange={e => setV(e.target.value)} placeholder="Quick message…" maxLength={200}
        className="flex-1 bg-transparent text-xs text-mist-200 placeholder:text-mist-700 outline-none" />
      <button type="submit" disabled={!v.trim()}
        className="shrink-0 text-mist-600 disabled:opacity-30 hover:text-signal-400 enabled:cursor-pointer transition-colors">
        <Send size={12} />
      </button>
    </form>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function GuessWhoGame({ roomId, connected, chat }) {
  const { state, waiting, error, askQuestion, accuse, toggleCharacter, restart } = useGuessWho(roomId, connected);
  const [showRules, setShowRules]         = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);
  const [showEmoji, setShowEmoji]         = useState(false);
  const [accuseMode, setAccuseMode]       = useState(false);
  const [pendingAccuse, setPendingAccuse] = useState(null);
  const [chatBubbles, setChatBubbles]     = useState([]);
  const lastMsgId = useRef(null);

  useEffect(() => {
    if (!chat?.messages?.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.kind !== 'message' || lastMsgId.current === last.id) return;
    lastMsgId.current = last.id;
    const b = { uid: `${last.id}-${Date.now()}`, name: last.senderName, text: last.text, x: 20 + Math.random() * 60 };
    setChatBubbles(prev => [...prev.slice(-3), b]);
    setTimeout(() => setChatBubbles(prev => prev.filter(x => x.uid !== b.uid)), 3000);
  }, [chat?.messages]);

  useEffect(() => { setAccuseMode(false); setPendingAccuse(null); }, [state?.myTurn, state?.winner]);

  function handleSend(text) {
    chat?.sendMessage?.(text);
    const b = { uid: `own-${Date.now()}`, name: 'You', text, x: 20 + Math.random() * 60 };
    setChatBubbles(prev => [...prev.slice(-3), b]);
    setTimeout(() => setChatBubbles(prev => prev.filter(x => x.uid !== b.uid)), 3000);
  }

  if (!connected) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">RECONNECTING…</p>
    </div>
  );
  if (waiting || !state) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="w-5 h-5 border-2 border-signal-500 border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">{waiting ? 'WAITING FOR OPPONENT' : 'CONNECTING…'}</p>
      {waiting && <p className="text-xs text-mist-600">Secrets assigned once opponent opens Guess Who.</p>}
    </div>
  );

  const eliminated = new Set(state.myEliminated);
  const activeCount = state.characters.length - eliminated.size;
  const lastQ = state.lastQuestion;
  const lastAcc = state.lastAccusation;
  const myLabel = `Player ${state.playerIndex + 1}`;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700/60 bg-ink-900/80 backdrop-blur">
        <button onClick={() => setShowEmoji(v => !v)}
          className="p-1.5 rounded-lg text-mist-600 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
          <Smile size={15} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display text-[11px] tracking-widest text-mist-100">GUESS WHO?</span>
          <span className="text-[9px] font-display px-2 py-0.5 rounded-full border border-cipher-700/50 text-cipher-400 bg-cipher-900/20">
            {activeCount} left
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-mist-600 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
            <BookOpen size={14} />
          </button>
          <button onClick={() => setShowSurrender(true)}
            className="p-1.5 rounded-lg text-danger/50 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer">
            <Flag size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showEmoji && (
          <div className="absolute top-11 left-3 z-50">
            <QuickReactBar onPick={e => { chat?.sendGameReaction?.(e); setShowEmoji(false); }} />
          </div>
        )}
      </AnimatePresence>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-3 py-2.5 relative">
        <FloatingBubbles bubbles={chatBubbles} />

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-1.5 shrink-0">
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {/* Game over */}
        {state.winner && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-xl border border-signal-500/30 bg-signal-900/20 p-4 text-center shrink-0"
          >
            <Sparkles size={16} className="text-signal-500 mx-auto mb-2" />
            <p className="font-display text-[11px] tracking-widest text-signal-500 mb-1">ROUND OVER</p>
            <p className="text-xs text-mist-300 mb-3">{state.log[state.log.length - 1]}</p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-4 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
              <RotateCcw size={12} /> Play again
            </button>
          </motion.div>
        )}

        {/* Wrong accusation flash */}
        {lastAcc && !lastAcc.correct && !state.winner && (
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 border border-danger/30 bg-danger/10 text-danger shrink-0">
            <Target size={12} />
            <span><b>{lastAcc.byLabel}</b> accused <b>{lastAcc.characterName}</b> — wrong! Turn forfeited.</span>
          </div>
        )}

        {/* My secret */}
        <div className="shrink-0 flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-800/30 px-3 py-2.5">
          <div className="w-11 h-11 rounded-lg bg-ink-900 border border-ink-700 flex items-center justify-center shrink-0 overflow-hidden">
            <CharacterAvatar character={state.mySecret} size={42} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-mist-700 uppercase tracking-widest mb-0.5">Your secret character</p>
            <p className="text-sm font-medium text-mist-100 truncate">{state.mySecret?.name}</p>
          </div>
        </div>

        {/* Turn + opponent status */}
        <div className={`shrink-0 flex items-center justify-between rounded-xl px-3 py-2 border transition-all ${
          !state.myTurn && !state.winner
            ? 'border-danger/30 bg-danger/5'
            : 'border-ink-700/40 bg-ink-800/20'
        }`}>
          <span className={`text-xs ${!state.myTurn && !state.winner ? 'text-danger' : 'text-mist-500'}`}>
            Opponent · {state.opponentActiveCount} remaining
            {!state.myTurn && !state.winner ? ' · thinking…' : ''}
          </span>
          <span className={`text-[10px] font-display tracking-wider px-2 py-0.5 rounded-full ${
            state.myTurn ? 'text-signal-400 bg-signal-900/20 border border-signal-700/40' : 'text-mist-600 bg-ink-800/50'
          }`}>
            {state.myTurn ? 'YOUR TURN' : 'WAITING'}
          </span>
        </div>

        {/* Last question */}
        {lastQ && (
          <div className="shrink-0 rounded-xl border border-ink-700/40 bg-ink-800/20 px-3 py-2">
            <p className="text-[9px] text-mist-700 uppercase tracking-widest mb-1">
              {lastQ.askedByLabel === myLabel ? 'You asked' : 'Opponent asked'}
            </p>
            <p className="text-xs text-mist-300">
              "{lastQ.questionText}" →{' '}
              <span className={`font-semibold ${lastQ.answer ? 'text-signal-400' : 'text-danger'}`}>
                {lastQ.answer ? 'Yes' : 'No'}
              </span>
            </p>
          </div>
        )}

        {/* Controls */}
        {!state.winner && (
          <div className="shrink-0 space-y-2">
            {!accuseMode ? (
              <>
                <QuestionPicker disabled={!state.myTurn} askedQuestions={state.myAskedQuestions}
                  onAsk={(k, v) => askQuestion(k, v)} />
                <button onClick={() => setAccuseMode(true)} disabled={!state.myTurn}
                  className="w-full flex items-center justify-center gap-1.5 text-xs rounded-xl border border-signal-700/50 text-signal-500 px-3 py-2 hover:bg-signal-900/20 hover:border-signal-500/60 disabled:opacity-30 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors">
                  <Target size={12} /> Make an accusation
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-signal-500/40 bg-signal-900/10 px-3 py-2">
                <span className="text-xs text-signal-400 flex items-center gap-1.5">
                  <Target size={12} /> Tap a character to accuse
                </span>
                <button onClick={() => setAccuseMode(false)}
                  className="text-[11px] text-mist-500 hover:text-mist-100 cursor-pointer underline underline-offset-2">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Board */}
        <div className="shrink-0">
          <p className="text-[9px] text-mist-700 uppercase tracking-widest mb-1.5">Your board · tap to cross off</p>
          <div className="grid grid-cols-5 gap-1.5">
            {state.characters.map(c => (
              <CharTile key={c.id} character={c} eliminated={eliminated.has(c.id)}
                accuseMode={accuseMode}
                onClick={() => {
                  if (state.winner) return;
                  if (accuseMode && state.myTurn) { setPendingAccuse(c); return; }
                  toggleCharacter(c.id);
                }} />
            ))}
          </div>
        </div>

        {/* Log */}
        <div className="shrink-0 rounded-xl border border-ink-700/30 bg-ink-800/10 px-3 py-2">
          <p className="text-[9px] text-mist-700 uppercase tracking-widest mb-1">Activity</p>
          {state.log.slice(-4).map((l, i) => (
            <p key={i} className="text-[11px] text-mist-500 leading-snug">{l}</p>
          ))}
        </div>
      </div>

      {/* ── CHAT ───────────────────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── MODALS ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRules     && <RulesModal onClose={() => setShowRules(false)} />}
        {showSurrender && <SurrenderModal onConfirm={() => { restart(); setShowSurrender(false); }} onCancel={() => setShowSurrender(false)} />}
        {pendingAccuse && (
          <AccuseModal character={pendingAccuse}
            onConfirm={() => { accuse(pendingAccuse.id); setPendingAccuse(null); setAccuseMode(false); }}
            onCancel={() => setPendingAccuse(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
