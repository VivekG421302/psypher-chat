import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw, AlertTriangle, BookOpen, X, MessageSquare, Send, Flag, Smile,
  Target, HelpCircle, Check, ChevronDown, Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CharacterAvatar from './CharacterAvatar.jsx';
import { TRAITS } from './characters.js';
import { useGuessWho } from './useGuessWho.js';
import QuickReactBar from '../../components/QuickReactBar.jsx';

/* ─── Rules Modal ────────────────────────────────────────────────── */
function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <p className="font-display text-xs tracking-widest text-mist-100">GUESS WHO? · RULES</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-100 cursor-pointer"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 text-[11.5px] text-mist-400 leading-relaxed">
          <RS title="🎯 Objective">You're each secretly assigned a character from the shared board. Be the first to correctly name your opponent's secret character.</RS>
          <RS title="▶️ On your turn">Ask a yes/no question about your opponent's secret character (e.g. "Is your character wearing glasses?"). The system answers instantly and automatically crosses off any of your board's characters that no longer fit — that's your personal deduction tool, so feel free to tap a card to flip it back if you disagree.</RS>
          <RS title="🕵️ Making an accusation">Instead of asking a question, you can accuse a specific character at any time on your turn. Guess right and you <b className="text-mist-200">win instantly</b>. Guess wrong and you forfeit your turn — so it's a real risk.</RS>
          <RS title="👀 What's public vs. secret">Every character's traits are visible to both players — the board is identical for you both. The only hidden thing is which character each of you was assigned.</RS>
          <RS title="🏆 Winning">First correct accusation wins the game.</RS>
        </div>
      </div>
    </div>
  );
}
function RS({ title, children }) {
  return <div><p className="text-mist-200 font-semibold mb-1">{title}</p><div>{children}</div></div>;
}

/* ─── Floating chat bubble ───────────────────────────────────────── */
function FloatingChatBubbles({ bubbles }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {bubbles.map((b) => (
          <motion.div
            key={b.uid}
            initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.85 }}
            animate={{ opacity: 1, y: -60, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -120, x: '-50%', scale: 0.8 }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
            className="absolute bottom-24 left-1/2"
            style={{ left: `${b.x}%`, transform: 'translateX(-50%)' }}
          >
            <div className="rounded-xl rounded-bl-sm bg-ink-700/95 border border-ink-500 px-3 py-1.5 shadow-lg max-w-[180px]">
              <p className="text-[10px] text-mist-500 leading-none mb-0.5">{b.name}</p>
              <p className="text-xs text-mist-100 break-words leading-snug">{b.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Inline chat bar ────────────────────────────────────────────── */
function InlineChat({ onSend }) {
  const [value, setValue] = useState('');

  function submit(e) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    onSend(t);
    setValue('');
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2 border-t border-ink-700/60 bg-ink-900 shrink-0">
      <MessageSquare size={13} className="text-mist-600 shrink-0" />
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Quick message…"
        maxLength={200}
        className="flex-1 bg-transparent text-xs text-mist-200 placeholder:text-mist-700 outline-none"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="shrink-0 text-mist-500 disabled:opacity-30 hover:text-signal-400 enabled:cursor-pointer transition-colors"
      >
        <Send size={13} />
      </button>
    </form>
  );
}

/* ─── Surrender confirm ──────────────────────────────────────────── */
function SurrenderModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 p-5 w-full max-w-xs text-center"
        onClick={e => e.stopPropagation()}>
        <Flag size={22} className="text-danger mx-auto mb-3" />
        <p className="text-sm text-mist-100 font-medium mb-1">Accept defeat?</p>
        <p className="text-xs text-mist-500 mb-4">This restarts the round with a fresh secret for each of you.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-100 cursor-pointer transition-colors">
            Keep playing
          </button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">
            I surrender
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Accuse confirmation ────────────────────────────────────────── */
function AccuseConfirmModal({ character, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="rounded-2xl border border-signal-500/40 bg-ink-900 p-5 w-full max-w-xs text-center"
        onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-xl bg-ink-800 border border-ink-600 mx-auto mb-3 flex items-center justify-center overflow-hidden">
          <CharacterAvatar character={character} size={56} />
        </div>
        <p className="text-sm text-mist-100 font-medium mb-1">Accuse <b className="text-signal-500">{character.name}</b>?</p>
        <p className="text-xs text-mist-500 mb-4">Right, and you win instantly. Wrong, and you lose your turn.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-100 cursor-pointer transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-signal-500 hover:bg-signal-300 py-2 text-ink-950 font-semibold cursor-pointer transition-colors">
            Accuse
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Question picker ────────────────────────────────────────────── */
function QuestionPicker({ disabled, askedQuestions, onAsk }) {
  const [openTrait, setOpenTrait] = useState(null);

  const askedSet = new Set(askedQuestions.map((q) => `${q.traitKey}:${q.value}`));

  function pick(trait, value) {
    onAsk(trait.key, value);
    setOpenTrait(null);
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/40 p-2.5">
      <p className="text-[11px] text-mist-500 mb-2 flex items-center gap-1.5">
        <HelpCircle size={12} /> Ask a question
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TRAITS.map((trait) => (
          <div key={trait.key} className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpenTrait((t) => (t === trait.key ? null : trait.key))}
              className={`flex items-center gap-1 text-[11px] rounded-lg border px-2.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer ${
                openTrait === trait.key
                  ? 'border-cipher-500 text-cipher-500 bg-cipher-700/10'
                  : 'border-ink-600 text-mist-300 hover:border-cipher-500/50'
              }`}
            >
              {trait.label} <ChevronDown size={11} />
            </button>

            <AnimatePresence>
              {openTrait === trait.key && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute z-30 top-full mt-1 left-0 rounded-xl border border-ink-600 bg-ink-800 shadow-xl p-1.5 min-w-[9rem]"
                >
                  {(trait.type === 'boolean' ? [true] : trait.values).map((value) => {
                    const key = `${trait.key}:${value}`;
                    const already = askedSet.has(key);
                    const text = trait.question(value);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => pick(trait, value)}
                        className={`w-full text-left text-[11px] rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          already ? 'text-mist-700 hover:bg-ink-700/50' : 'text-mist-200 hover:bg-ink-700'
                        }`}
                      >
                        <span>{trait.type === 'boolean' ? text : value[0].toUpperCase() + value.slice(1)}</span>
                        {already && <Check size={11} className="text-mist-700 shrink-0" />}
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

/* ─── Character grid tile ────────────────────────────────────────── */
function CharacterTile({ character, eliminated, accuseMode, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all cursor-pointer ${
        eliminated
          ? 'border-ink-700 bg-ink-800/30 opacity-35 grayscale'
          : accuseMode
          ? 'border-signal-500/50 bg-ink-800/60 hover:border-signal-500 hover:-translate-y-0.5'
          : 'border-ink-700 bg-ink-800/60 hover:border-cipher-500/50 hover:-translate-y-0.5'
      }`}
      title={eliminated ? `${character.name} (crossed off — tap to bring back)` : character.name}
    >
      <div className="w-10 h-10 rounded-md bg-ink-900/60 flex items-center justify-center overflow-hidden">
        <CharacterAvatar character={character} size={38} />
      </div>
      <span className={`text-[9px] leading-none truncate max-w-full ${eliminated ? 'text-mist-700 line-through' : 'text-mist-300'}`}>
        {character.name}
      </span>
      {eliminated && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-full h-[1.5px] bg-danger/70 rotate-[-18deg]" />
        </span>
      )}
    </button>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function GuessWhoGame({ roomId, connected, onClose, chat }) {
  const { state, waiting, error, askQuestion, accuse, toggleCharacter, restart } = useGuessWho(roomId, connected);

  const [showRules, setShowRules] = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [accuseMode, setAccuseMode] = useState(false);
  const [pendingAccuse, setPendingAccuse] = useState(null); // character object
  const [chatBubbles, setChatBubbles] = useState([]);
  const lastSeenMsgId = useRef(null);

  // Incoming chat → floating bubble
  useEffect(() => {
    if (!chat?.messages?.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.kind !== 'message' || lastSeenMsgId.current === last.id) return;
    lastSeenMsgId.current = last.id;
    const bubble = {
      uid: `${last.id}-${Date.now()}`,
      name: last.senderName,
      text: last.text,
      x: 25 + Math.random() * 50,
    };
    setChatBubbles((b) => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles((b) => b.filter((x) => x.uid !== bubble.uid)), 3000);
  }, [chat?.messages]);

  // Exit accuse mode whenever the turn changes or the game ends.
  useEffect(() => {
    setAccuseMode(false);
    setPendingAccuse(null);
  }, [state?.myTurn, state?.winner]);

  /* ── loading states ── */
  if (!connected) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-mist-500 p-6 text-center">
      <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">RECONNECTING…</p>
    </div>
  );

  if (waiting || !state) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-mist-500 p-6 text-center">
      <div className="w-5 h-5 border-2 border-signal-500 border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest text-mist-100">
        {waiting ? 'WAITING FOR OPPONENT' : 'CONNECTING…'}
      </p>
      {waiting && <p className="text-xs">Secrets get assigned once your opponent opens Guess Who.</p>}
    </div>
  );

  function handleSend(text) {
    chat?.sendMessage?.(text);
    const bubble = { uid: `own-${Date.now()}`, name: 'You', text, x: 25 + Math.random() * 50 };
    setChatBubbles((b) => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles((b) => b.filter((x) => x.uid !== bubble.uid)), 3000);
  }

  function handleTileClick(character) {
    if (state.winner) return;
    if (accuseMode) {
      if (!state.myTurn) return;
      setPendingAccuse(character);
      return;
    }
    toggleCharacter(character.id);
  }

  const eliminatedSet = new Set(state.myEliminated);
  const activeCount = state.characters.length - eliminatedSet.size;
  const lastQ = state.lastQuestion;
  const lastAcc = state.lastAccusation;
  const iAskedLastQ = lastQ && (lastQ.askedByLabel === `Player ${state.playerIndex + 1}`);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950">

      {/* ── 1. HEADER ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700 bg-ink-900">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
          title="Quick reactions"
        >
          <Smile size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-xs tracking-widest text-mist-100">GUESS WHO?</span>
          <span className="text-[10px] bg-cipher-700/15 border border-cipher-700/40 text-cipher-500 rounded-full px-2 py-0.5 font-medium">
            {activeCount} left
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
            title="Rules"
          >
            <BookOpen size={15} />
          </button>
          <button
            onClick={() => setShowSurrender(true)}
            className="p-1.5 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title="Concede game"
          >
            <Flag size={15} />
          </button>
        </div>
      </div>

      {/* Emoji picker overlay */}
      <AnimatePresence>
        {showEmoji && (
          <div className="absolute top-12 left-3 z-50">
            <QuickReactBar
              onPick={(emoji) => {
                chat?.sendGameReaction?.(emoji);
                setShowEmoji(false);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ── Scrollable middle ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 px-3 py-2.5 relative">
        <FloatingChatBubbles bubbles={chatBubbles} />

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 shrink-0">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* Game over */}
        {state.winner && (
          <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center shrink-0">
            <Sparkles size={18} className="text-signal-500 mx-auto mb-1" />
            <p className="font-display text-xs text-signal-500 mb-1">GAME OVER</p>
            <p className="text-sm text-mist-100 mb-3">{state.log[state.log.length - 1] || 'Round finished.'}</p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-3 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
              <RotateCcw size={13} /> Play again
            </button>
          </div>
        )}

        {/* Wrong accusation banner (only shows briefly via log; surface the freshest one explicitly) */}
        {lastAcc && !lastAcc.correct && !state.winner && (
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 border border-danger/40 bg-danger/10 text-danger shrink-0">
            <Target size={13} />
            <span><b>{lastAcc.byLabel}</b> accused <b>{lastAcc.characterName}</b> — wrong! Turn forfeited.</span>
          </div>
        )}

        {/* My secret character */}
        <div className="shrink-0 flex items-center gap-3 rounded-xl border border-cipher-700/40 bg-cipher-700/5 px-3 py-2.5">
          <div className="w-12 h-12 rounded-lg bg-ink-900/60 border border-cipher-700/30 flex items-center justify-center shrink-0 overflow-hidden">
            <CharacterAvatar character={state.mySecret} size={44} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-mist-500 leading-none mb-1">Your character (opponent is trying to guess this)</p>
            <p className="text-sm font-medium text-mist-100 truncate">{state.mySecret?.name}</p>
          </div>
        </div>

        {/* Opponent status */}
        <div className={`shrink-0 flex items-center justify-between rounded-xl px-2.5 py-2 transition-all ${
          !state.myTurn && !state.winner ? 'ring-1 ring-danger/50 bg-danger/5' : 'bg-ink-800/40'
        }`}>
          <span className={`text-xs ${!state.myTurn && !state.winner ? 'text-danger font-medium' : 'text-mist-500'}`}>
            Opponent · {state.opponentActiveCount} characters left{!state.myTurn && !state.winner ? ' · their turn' : ''}
          </span>
          <p className={`text-[11px] font-display tracking-widest px-2.5 py-0.5 rounded-full ${
            state.myTurn ? 'text-cipher-500 bg-cipher-700/10' : 'text-danger bg-danger/10'
          }`}>
            {state.myTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
          </p>
        </div>

        {/* Last question banner */}
        {lastQ && (
          <div className="shrink-0 rounded-lg border border-ink-700 bg-ink-800/40 px-3 py-2">
            <p className="text-[10px] text-mist-600 mb-0.5">
              {iAskedLastQ ? 'You asked' : lastQ.askedByLabel + ' asked'}
            </p>
            <p className="text-xs text-mist-200">
              "{lastQ.questionText}" →{' '}
              <span className={lastQ.answer ? 'text-cipher-500 font-semibold' : 'text-danger font-semibold'}>
                {lastQ.answer ? 'Yes' : 'No'}
              </span>
            </p>
          </div>
        )}

        {/* Question picker / accuse controls */}
        {!state.winner && (
          <div className="shrink-0 space-y-2">
            {!accuseMode ? (
              <>
                <QuestionPicker
                  disabled={!state.myTurn}
                  askedQuestions={state.myAskedQuestions}
                  onAsk={(traitKey, value) => askQuestion(traitKey, value)}
                />
                <button
                  onClick={() => setAccuseMode(true)}
                  disabled={!state.myTurn}
                  className="w-full flex items-center justify-center gap-1.5 text-xs rounded-lg border border-signal-500/50 text-signal-500 px-3 py-2 hover:bg-signal-700/10 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer transition-colors"
                >
                  <Target size={13} /> Make an accusation
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-signal-500/50 bg-signal-700/10 px-3 py-2">
                <span className="text-xs text-signal-500 flex items-center gap-1.5">
                  <Target size={13} /> Tap a character below to accuse
                </span>
                <button
                  onClick={() => setAccuseMode(false)}
                  className="text-[11px] text-mist-400 hover:text-mist-100 cursor-pointer underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Board grid */}
        <div className="shrink-0">
          <p className="text-[11px] text-mist-500 mb-1.5">Your board · tap a character to cross it off</p>
          <div className="grid grid-cols-5 gap-1.5">
            {state.characters.map((c) => (
              <CharacterTile
                key={c.id}
                character={c}
                eliminated={eliminatedSet.has(c.id)}
                accuseMode={accuseMode}
                onClick={() => handleTileClick(c)}
              />
            ))}
          </div>
        </div>

        {/* Log */}
        <div className="shrink-0 rounded-lg border border-ink-700/60 bg-ink-800/20 px-3 py-2">
          <p className="text-[10px] text-mist-600 mb-1">Recent activity</p>
          <div className="space-y-0.5">
            {state.log.slice(-4).map((l, i) => (
              <p key={i} className="text-[11px] text-mist-500 leading-snug">{l}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── FLOATING CHAT BAR ─────────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showSurrender && (
        <SurrenderModal
          onConfirm={() => { restart(); setShowSurrender(false); }}
          onCancel={() => setShowSurrender(false)}
        />
      )}

      {pendingAccuse && (
        <AccuseConfirmModal
          character={pendingAccuse}
          onConfirm={() => {
            accuse(pendingAccuse.id);
            setPendingAccuse(null);
            setAccuseMode(false);
          }}
          onCancel={() => setPendingAccuse(null)}
        />
      )}
    </div>
  );
}
