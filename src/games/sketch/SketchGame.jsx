import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw, AlertTriangle, BookOpen, X, MessageSquare, Send, Flag, Smile, Sparkles,
  Eraser, Undo2, Pencil, Check, Flame, Clock, SkipForward, PaintBucket,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSketch } from './useSketch.js';
import DrawingCanvas from './DrawingCanvas.jsx';
import QuickReactBar from '../../components/QuickReactBar.jsx';

const COLORS = ['#1A1A1A', '#E85D5D', '#E8A33D', '#F0D93D', '#2E9E63', '#3576E0', '#8B5CF6', '#FFFFFF'];
const SIZES = [{ label: 'S', value: 3 }, { label: 'M', value: 7 }, { label: 'L', value: 14 }];

/* ─── Rules Modal ────────────────────────────────────────────────── */
function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <p className="font-display text-xs tracking-widest text-mist-100">SKETCH & GUESS · RULES</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-100 cursor-pointer"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 text-[11.5px] text-mist-400 leading-relaxed">
          <RS title="🎯 Objective">Six rounds, three turns each. Draw your word so your opponent can guess it fast — or guess theirs before time runs out.</RS>
          <RS title="✏️ Drawing">Pick one of 3 words, then sketch it on the board. Your opponent watches it appear stroke by stroke in real time.</RS>
          <RS title="⌨️ Guessing">Type what you think it is. Get it exact to win the round — a 🔥 means you're close.</RS>
          <RS title="⏱️ Scoring">Faster correct guesses score more (up to 100). The drawer always gets +30 when their word is guessed. Nobody scores if time runs out.</RS>
          <RS title="🏳️ Giving up">Either player can end a stuck round early — the word gets revealed with no points awarded.</RS>
          <RS title="🏆 Winning">Highest total score after 6 rounds wins the match.</RS>
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

/* ─── Inline chat bar (banter, separate from guessing) ─────────────── */
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

/* ─── Concede confirm ────────────────────────────────────────────── */
function ConcedeModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 p-5 w-full max-w-xs text-center"
        onClick={e => e.stopPropagation()}>
        <Flag size={22} className="text-danger mx-auto mb-3" />
        <p className="text-sm text-mist-100 font-medium mb-1">Restart the match?</p>
        <p className="text-xs text-mist-500 mb-4">Scores reset and a fresh round 1 begins.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-100 cursor-pointer transition-colors">
            Keep playing
          </button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Countdown bar ──────────────────────────────────────────────── */
function CountdownBar({ remainingMs, totalMs, urgent }) {
  const pct = totalMs ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div className="shrink-0 flex items-center gap-2">
      <Clock size={13} className={urgent ? 'text-danger' : 'text-mist-500'} />
      <div className="flex-1 h-1.5 rounded-full bg-ink-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${urgent ? 'bg-danger' : 'bg-cipher-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-display tabular-nums ${urgent ? 'text-danger' : 'text-mist-400'}`}>{seconds}s</span>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function SketchGame({ roomId, identity, connected, chat }) {
  const {
    state, waiting, error,
    chooseWord, drawStroke, clearCanvas, undoStroke, fillBackground, guess, skipRound, timeUp, nextRound, restart,
  } = useSketch(roomId, connected);

  const [showRules, setShowRules] = useState(false);
  const [showConcede, setShowConcede] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showFillPalette, setShowFillPalette] = useState(false);
  const [chatBubbles, setChatBubbles] = useState([]);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1].value);
  const [guessValue, setGuessValue] = useState('');
  const lastSeenMsgId = useRef(null);
  const [now, setNow] = useState(Date.now());
  const firedDeadline = useRef(null);
  const guessListRef = useRef(null);

  const deadline = state?.phase === 'choosing' ? state.choiceDeadline
    : state?.phase === 'drawing' ? state.roundDeadline
    : null;
  const totalMs = state?.phase === 'choosing' ? state?.choiceDurationMs : state?.roundDurationMs;

  // Local countdown tick + defensive client-driven time-out ping (server is
  // authoritative and will simply reject an early call — see useSketch).
  useEffect(() => {
    if (!deadline) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [deadline]);

  useEffect(() => {
    if (deadline && now >= deadline && firedDeadline.current !== deadline) {
      firedDeadline.current = deadline;
      timeUp();
    }
    if (!deadline) firedDeadline.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, deadline]);

  // Incoming chat → floating bubble
  useEffect(() => {
    if (!chat?.messages?.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.kind !== 'message' || lastSeenMsgId.current === last.id) return;
    lastSeenMsgId.current = last.id;
    const bubble = { uid: `${last.id}-${Date.now()}`, name: last.senderName, text: last.text, x: 25 + Math.random() * 50 };
    setChatBubbles((b) => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles((b) => b.filter((x) => x.uid !== bubble.uid)), 3000);
  }, [chat?.messages]);

  // Auto-scroll guess feed
  useEffect(() => {
    guessListRef.current?.scrollTo({ top: guessListRef.current.scrollHeight, behavior: 'smooth' });
  }, [state?.guesses?.length]);

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
      {waiting && <p className="text-xs">The board opens once your opponent joins Sketch & Guess too.</p>}
    </div>
  );

  function handleSend(text) {
    chat?.sendMessage?.(text);
    const bubble = { uid: `own-${Date.now()}`, name: 'You', text, x: 25 + Math.random() * 50 };
    setChatBubbles((b) => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles((b) => b.filter((x) => x.uid !== bubble.uid)), 3000);
  }

  function submitGuess(e) {
    e.preventDefault();
    const t = guessValue.trim();
    if (!t) return;
    guess(t);
    setGuessValue('');
  }

  const isDrawer = state.myRole === 'drawer';
  const isGuesser = state.myRole === 'guesser';
  const remainingMs = deadline ? Math.max(0, deadline - now) : 0;
  const urgent = totalMs ? remainingMs < totalMs * 0.25 : false;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700 bg-ink-900">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer"
          title="Quick reactions"
        >
          <Smile size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-xs tracking-widest text-mist-100">SKETCH & GUESS</span>
          {state.started && (
            <span className="text-[10px] bg-cipher-700/15 border border-cipher-700/40 text-cipher-500 rounded-full px-2 py-0.5 font-medium">
              {state.scores.mine} – {state.scores.opponent} · R{state.round}/{state.totalRounds}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer" title="Rules">
            <BookOpen size={15} />
          </button>
          <button onClick={() => setShowConcede(true)}
            className="p-1.5 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer" title="Restart match">
            <Flag size={15} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showEmoji && (
          <div className="absolute top-12 left-3 z-50">
            <QuickReactBar onPick={(emoji) => { chat?.sendGameReaction?.(emoji); setShowEmoji(false); }} />
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

        {/* ── CHOOSING PHASE ─────────────────────────────────────────── */}
        {state.phase === 'choosing' && (
          <div className="shrink-0 rounded-xl border border-ink-700 bg-ink-800/40 p-4 flex flex-col gap-3">
            <CountdownBar remainingMs={remainingMs} totalMs={totalMs} urgent={urgent} />
            {isDrawer ? (
              <>
                <p className="text-sm text-mist-100 text-center font-medium">Pick a word to draw</p>
                <div className="flex flex-col gap-2">
                  {(state.wordChoices || []).map((w) => (
                    <button key={w} onClick={() => chooseWord(w)}
                      className="rounded-lg border border-cipher-700/40 bg-cipher-700/10 hover:bg-cipher-700/20 px-3 py-2.5 text-sm text-mist-100 font-medium capitalize cursor-pointer transition-colors">
                      {w}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="w-5 h-5 border-2 border-signal-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-mist-300">Opponent is picking a word…</p>
              </div>
            )}
          </div>
        )}

        {/* ── DRAWING PHASE ──────────────────────────────────────────── */}
        {state.phase === 'drawing' && (
          <div className="shrink-0 flex flex-col gap-2.5">
            <CountdownBar remainingMs={remainingMs} totalMs={totalMs} urgent={urgent} />

            {/* Word banner */}
            <div className="rounded-lg border border-ink-700 bg-ink-800/40 px-3 py-2 flex items-center justify-center gap-2">
              {isDrawer ? (
                <p className="text-sm font-display tracking-wide text-signal-500 capitalize">{state.wordReveal}</p>
              ) : (
                <p className="text-sm font-display tracking-[0.3em] text-mist-200">
                  {state.hint || '_ '.repeat(state.wordLength || 0)}
                  <span className="text-[10px] text-mist-600 tracking-normal ml-2">({state.wordLength} letters)</span>
                </p>
              )}
            </div>

            {/* Toolbar (drawer only) */}
            {isDrawer && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${color === c ? 'border-signal-500 scale-110' : 'border-ink-600'}`}
                      style={{ background: c }} aria-label={`Color ${c}`} />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {SIZES.map((s) => (
                    <button key={s.value} onClick={() => setBrushSize(s.value)}
                      className={`w-7 h-7 rounded-lg border text-[10px] font-medium cursor-pointer transition-colors ${
                        brushSize === s.value ? 'border-cipher-500 text-cipher-500 bg-cipher-700/10' : 'border-ink-600 text-mist-500 hover:text-mist-100'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                  <button onClick={undoStroke} title="Undo"
                    className="w-7 h-7 rounded-lg border border-ink-600 text-mist-400 hover:text-mist-100 flex items-center justify-center cursor-pointer transition-colors">
                    <Undo2 size={13} />
                  </button>
                  <button onClick={clearCanvas} title="Clear"
                    className="w-7 h-7 rounded-lg border border-ink-600 text-mist-400 hover:text-danger flex items-center justify-center cursor-pointer transition-colors">
                    <Eraser size={13} />
                  </button>
                  {/* Fill bucket */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFillPalette(v => !v)}
                      title="Fill background"
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                        showFillPalette ? 'border-cipher-500 text-cipher-500 bg-cipher-700/10' : 'border-ink-600 text-mist-400 hover:text-mist-100'
                      }`}
                    >
                      <PaintBucket size={13} />
                    </button>
                    {showFillPalette && (
                      <div className="absolute bottom-full mb-1 left-0 z-30 bg-ink-800 border border-ink-600 rounded-xl p-2 shadow-xl" style={{width:'152px'}}>
                        <p className="text-[9px] text-mist-600 uppercase tracking-wider mb-1.5 px-0.5">Fill background</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            ['#FFFFFF','White'],['#FFF9C4','Yellow'],['#FFCCBC','Peach'],
                            ['#C8E6C9','Green'],['#BBDEFB','Blue'],['#E1BEE7','Purple'],
                            ['#D7CCC8','Brown'],['#1A1A1A','Black'],['#FFD6E0','Pink'],['#E0F7FA','Cyan'],
                          ].map(([bg, label]) => (
                            <button
                              key={bg}
                              onClick={() => { fillBackground(bg); setShowFillPalette(false); }}
                              className={`w-9 h-9 rounded-lg border-2 hover:border-signal-500 cursor-pointer transition-all ${state.bgColor === bg ? 'border-signal-500 scale-110' : 'border-ink-500'}`}
                              style={{ background: bg }}
                              title={label}
                            />
                          ))}
                        </div>
                        {state.bgColor && state.bgColor !== '#FFFFFF' && (
                          <button onClick={() => { fillBackground('#FFFFFF'); setShowFillPalette(false); }}
                            className="mt-2 w-full text-[10px] text-mist-500 hover:text-danger text-center cursor-pointer">
                            ✕ Clear fill
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </div>
            )}

            <DrawingCanvas
              strokes={state.strokes}
              isDrawer={isDrawer}
              color={color}
              size={brushSize}
              roundKey={state.round}
              onStroke={drawStroke}
              bgColor={state.bgColor}
            />

            {isDrawer && (
              <p className="text-[11px] text-mist-600 text-center flex items-center justify-center gap-1">
                <Pencil size={11} /> Your opponent is watching you draw
              </p>
            )}

            {/* Guess input (guesser only) */}
            {isGuesser && (
              <form onSubmit={submitGuess} className="flex items-center gap-2">
                <input
                  value={guessValue}
                  onChange={(e) => setGuessValue(e.target.value)}
                  placeholder="Type your guess…"
                  maxLength={40}
                  autoComplete="off"
                  className="flex-1 rounded-lg bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal-500 outline-none transition-colors"
                />
                <button type="submit" disabled={!guessValue.trim()}
                  className="shrink-0 rounded-lg bg-signal-500 disabled:bg-ink-700 disabled:text-mist-700 disabled:cursor-not-allowed enabled:cursor-pointer text-ink-950 p-2.5 hover:bg-signal-300 transition-colors">
                  <Send size={15} />
                </button>
              </form>
            )}

            {/* Guess feed — visible to both, drawer sees attempts land */}
            {state.guesses.length > 0 && (
              <div ref={guessListRef} className="max-h-28 overflow-y-auto rounded-lg border border-ink-700/60 bg-ink-800/20 px-3 py-2 space-y-1">
                {state.guesses.map((g, i) => (
                  <p key={i} className={`text-xs flex items-center gap-1.5 ${g.correct ? 'text-cipher-500 font-medium' : 'text-mist-400'}`}>
                    {g.correct ? <Check size={12} /> : g.close ? <Flame size={12} className="text-signal-500" /> : null}
                    <span className="text-mist-600">{g.byLabel}:</span> {g.text}
                  </p>
                ))}
              </div>
            )}

            <button onClick={skipRound}
              className="self-center text-[11px] text-mist-600 hover:text-danger flex items-center gap-1 cursor-pointer transition-colors">
              <SkipForward size={12} /> Give up & reveal word
            </button>
          </div>
        )}

        {/* ── ROUND END PHASE ────────────────────────────────────────── */}
        {state.phase === 'roundEnd' && (
          <div className="shrink-0 flex flex-col gap-2.5">
            <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center">
              <p className="font-display text-xs text-signal-500 mb-1">
                {state.roundWinnerId ? `${state.roundWinnerLabel} GUESSED IT!` : "TIME'S UP"}
              </p>
              <p className="text-sm text-mist-100 mb-1">
                The word was <span className="font-semibold capitalize text-signal-300">{state.lastRoundWord}</span>
              </p>
              {state.roundPointsAwarded && (
                <p className="text-xs text-mist-500 mb-3">
                  +{state.roundPointsAwarded.guesserPoints} guessing · +{state.roundPointsAwarded.drawerPoints} drawing
                </p>
              )}
              <button onClick={nextRound}
                className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-3 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
                Next round
              </button>
            </div>
            <DrawingCanvas strokes={state.strokes} isDrawer={false} roundKey={`end-${state.round}`} bgColor={state.bgColor} />
          </div>
        )}

        {/* ── GAME END PHASE ─────────────────────────────────────────── */}
        {state.phase === 'gameEnd' && (
          <div className="rounded-xl border border-signal-500/40 bg-signal-700/10 p-4 text-center shrink-0">
            <Sparkles size={18} className="text-signal-500 mx-auto mb-1" />
            <p className="font-display text-xs text-signal-500 mb-1">
              {state.winner === 'draw' ? "IT'S A TIE" : state.iWon ? 'YOU WIN THE MATCH' : 'OPPONENT WINS THE MATCH'}
            </p>
            <p className="text-sm text-mist-100 mb-3">Final score: {state.scores.mine} – {state.scores.opponent}</p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-3 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
              <RotateCcw size={13} /> Play again
            </button>
          </div>
        )}

        {/* Log */}
        {state.log?.length > 0 && (
          <div className="shrink-0 rounded-lg border border-ink-700/60 bg-ink-800/20 px-3 py-2">
            <p className="text-[10px] text-mist-600 mb-1">Recent activity</p>
            <div className="space-y-0.5">
              {state.log.slice(-4).map((l, i) => (
                <p key={i} className="text-[11px] text-mist-500 leading-snug">{l}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CHAT BAR ───────────────────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showConcede && (
        <ConcedeModal
          onConfirm={() => { restart(); setShowConcede(false); }}
          onCancel={() => setShowConcede(false)}
        />
      )}
    </div>
  );
}
