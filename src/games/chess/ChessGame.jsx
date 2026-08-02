import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RotateCcw, AlertTriangle, BookOpen, Flag, MessageSquare, Send, X, Smile, Handshake,
} from 'lucide-react';
import { useChess } from './useChess.js';
import QuickReactBar from '../../components/QuickReactBar.jsx';

// ─── Piece glyphs ───────────────────────────────────────────────
const GLYPHS = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

const FILE  = ['a','b','c','d','e','f','g','h'];
const RANK  = ['8','7','6','5','4','3','2','1'];

// ─── Shared sub-components (same pattern as other games) ────────
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
      <input value={value} onChange={e => setValue(e.target.value)}
        placeholder="Quick message…" maxLength={200}
        className="flex-1 bg-transparent text-xs text-mist-200 placeholder:text-mist-700 outline-none" />
      <button type="submit" disabled={!value.trim()}
        className="shrink-0 text-mist-500 disabled:opacity-30 hover:text-signal-400 enabled:cursor-pointer transition-colors">
        <Send size={13} />
      </button>
    </form>
  );
}

function FloatingBubbles({ bubbles }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {bubbles.map(b => (
          <motion.div key={b.uid}
            initial={{ opacity: 0, y: 0, scale: 0.85 }}
            animate={{ opacity: 1, y: -55, scale: 1 }}
            exit={{ opacity: 0, y: -110, scale: 0.8 }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
            className="absolute bottom-20"
            style={{ left: `${b.x}%`, transform: 'translateX(-50%)' }}>
            <div className="rounded-xl rounded-bl-sm bg-ink-700/95 border border-ink-500 px-3 py-1.5 shadow-lg max-w-[180px]">
              <p className="text-[10px] text-mist-500 mb-0.5">{b.name}</p>
              <p className="text-xs text-mist-100 break-words leading-snug">{b.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 w-full max-w-sm max-h-[82vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
          <p className="font-display text-xs tracking-widest text-mist-100">CHESS · RULES</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-100 cursor-pointer"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 text-[11.5px] text-mist-400 leading-relaxed">
          <RS title="🎯 Objective">Put your opponent's King in checkmate — a check they can't escape.</RS>
          <RS title="♟ Pawn">Moves forward 1 square (or 2 from its starting row). Captures diagonally. Promotes to Q, R, B, or N on reaching the last rank.</RS>
          <RS title="♜ Rook">Slides any number of squares horizontally or vertically.</RS>
          <RS title="♞ Knight">Jumps in an L-shape (2+1). The only piece that can jump over others.</RS>
          <RS title="♝ Bishop">Slides any number of squares diagonally. Always stays on its starting color.</RS>
          <RS title="♛ Queen">Slides in any direction — most powerful piece on the board.</RS>
          <RS title="♚ King">Moves one square in any direction. Cannot move into check.</RS>
          <RS title="🏰 Castling">The King slides 2 squares toward a Rook, and the Rook jumps to the other side — if neither piece has moved and no squares in between are attacked.</RS>
          <RS title="⚡ En Passant">After a pawn advances 2 squares, an adjacent enemy pawn may capture it as if it had moved only 1 — on the very next move only.</RS>
          <RS title="🤝 Draw">Offer a draw via the handshake button. If your opponent accepts, the game ends in a draw. Stalemate (no legal move, not in check) is also a draw.</RS>
          <RS title="🏳️ Resign">Tap the flag button to resign and concede the game to your opponent.</RS>
          <RS title="🔁 Rematch">Either player can start a rematch after a game ends. Colors swap each round.</RS>
        </div>
      </div>
    </div>
  );
}
function RS({ title, children }) {
  return <div><p className="text-mist-200 font-semibold mb-0.5">{title}</p><div>{children}</div></div>;
}

function ResignModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="rounded-2xl border border-ink-600 bg-ink-900 p-5 w-full max-w-xs text-center"
        onClick={e => e.stopPropagation()}>
        <Flag size={22} className="text-danger mx-auto mb-3" />
        <p className="text-sm text-mist-100 font-medium mb-1">Resign?</p>
        <p className="text-xs text-mist-500 mb-4">Your opponent wins the game.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs rounded-lg border border-ink-600 py-2 text-mist-400 hover:text-mist-100 cursor-pointer transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 text-xs rounded-lg bg-danger/80 hover:bg-danger py-2 text-white font-medium cursor-pointer transition-colors">Resign</button>
        </div>
      </div>
    </div>
  );
}

// ─── Promotion picker ───────────────────────────────────────────
function PromotionModal({ color, onPick }) {
  const pieces = ['Q','R','B','N'];
  const glyphs = { Q: color==='w'?'♕':'♛', R: color==='w'?'♖':'♜', B: color==='w'?'♗':'♝', N: color==='w'?'♘':'♞' };
  return (
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-6">
      <div className="rounded-2xl border border-ink-600 bg-ink-900 p-5 w-full max-w-xs text-center">
        <p className="text-sm text-mist-100 font-medium mb-4">Promote pawn to…</p>
        <div className="grid grid-cols-4 gap-2">
          {pieces.map(p => (
            <button key={p} onClick={() => onPick(p)}
              className="aspect-square rounded-xl border border-ink-600 bg-ink-800 hover:border-cipher-500/60 hover:bg-ink-700 cursor-pointer transition-all flex items-center justify-center text-3xl">
              {glyphs[p]}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-mist-600 mt-3">Q · R · B · N</p>
      </div>
    </div>
  );
}

// ─── The board ──────────────────────────────────────────────────
function Board({ board, myColor, selected, legalTargets, lastMove, onSquareClick, myTurn, winner }) {
  // Flip board for black
  const rows = myColor === 'b' ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols = myColor === 'b' ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  const legalSet = new Set(legalTargets.map(([r,c]) => `${r},${c}`));

  return (
    <div className="w-full max-w-[340px] mx-auto select-none">
      {/* File labels top */}
      <div className="flex pl-5 mb-0.5">
        {cols.map(c => (
          <div key={c} className="flex-1 text-center text-[9px] text-mist-700">{FILE[c]}</div>
        ))}
      </div>

      <div className="flex">
        {/* Rank labels */}
        <div className="flex flex-col w-5 shrink-0">
          {rows.map(r => (
            <div key={r} className="flex-1 flex items-center justify-center text-[9px] text-mist-700">{RANK[r]}</div>
          ))}
        </div>

        {/* Squares */}
        <div className="flex-1 grid grid-cols-8 border border-ink-600 rounded-lg overflow-hidden">
          {rows.map(r => cols.map(c => {
            const isDark      = (r + c) % 2 === 1;
            const p           = board[r][c];
            const isSelected  = selected && selected[0] === r && selected[1] === c;
            const isTarget    = legalSet.has(`${r},${c}`);
            const isLastFrom  = lastMove && lastMove.fromR === r && lastMove.fromC === c;
            const isLastTo    = lastMove && lastMove.toR   === r && lastMove.toC   === c;
            const isCapture   = isTarget && !!p;
            const pieceColor  = p ? p[0] : null;
            const clickable   = myTurn && !winner && (
              (p && pieceColor === myColor && !isSelected) ||
              isSelected || isTarget
            );

            let bg = isDark ? 'bg-[#4a6741]' : 'bg-[#eeeed2]';
            if (isSelected)             bg = 'bg-cipher-500/60';
            else if (isLastFrom || isLastTo) bg = isDark ? 'bg-[#6b7f2b]' : 'bg-[#cdd16f]';

            return (
              <div
                key={`${r},${c}`}
                onClick={() => clickable || isTarget ? onSquareClick(r, c) : undefined}
                className={`aspect-square relative flex items-center justify-center transition-colors ${bg} ${
                  clickable || isTarget ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Legal move dot / capture ring */}
                {isTarget && !isCapture && (
                  <div className="absolute w-[32%] h-[32%] rounded-full bg-black/25 pointer-events-none" />
                )}
                {isTarget && isCapture && (
                  <div className="absolute inset-0 rounded-none border-[3px] border-black/30 pointer-events-none" />
                )}

                {/* Piece */}
                {p && (
                  <span
                    className={`text-[min(4vw,22px)] leading-none pointer-events-none drop-shadow-sm ${
                      pieceColor === 'w' ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-[#1a1a1a]'
                    }`}
                  >
                    {GLYPHS[p]}
                  </span>
                )}
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
}

// ─── Legal move calculator (mirrors backend logic, client-side for UX) ──
// We call the backend for authoritative moves; this is just for highlighting.
// Since we can't run backend logic on the client, we'll use a simplified
// approach: select a piece → send tentative move → server validates.
// We DO compute legal targets on the client for the highlight dots using
// the same algorithm — keeps it responsive without an extra round-trip.

function clientLegalMoves(board, r, c, castling, enPassant) {
  // Simplified client-side check for UX highlighting only.
  // We re-implement the key rules here to avoid shipping the full engine.
  const p = board?.[r]?.[c];
  if (!p) return [];
  const color = p[0];
  const type  = p[1];
  const moves = [];

  function opp(col) { return col === 'w' ? 'b' : 'w'; }
  function get(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8 ? board[row][col] : null; }
  function pColor(pc) { return pc ? pc[0] : null; }

  function slide(dirs) {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = get(nr, nc);
        if (pColor(target) === color) break;
        moves.push([nr, nc]);
        if (target) break;
        nr += dr; nc += dc;
      }
    }
  }

  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      if (!get(r + dir, c)) {
        moves.push([r + dir, c]);
        if (r === startRow && !get(r + 2 * dir, c)) moves.push([r + 2 * dir, c]);
      }
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc;
        if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) continue;
        const target = get(tr, tc);
        if (pColor(target) === opp(color)) moves.push([tr, tc]);
        if (enPassant && enPassant[0] === tr && enPassant[1] === tc) moves.push([tr, tc]);
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const tr = r + dr, tc = c + dc;
        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && pColor(get(tr, tc)) !== color)
          moves.push([tr, tc]);
      }
      break;
    case 'B': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'R': slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'Q': slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'K': {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const tr = r + dr, tc = c + dc;
        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && pColor(get(tr, tc)) !== color)
          moves.push([tr, tc]);
      }
      // Castling hints
      const row = color === 'w' ? 7 : 0;
      if (r === row && c === 4) {
        if (castling?.[`${color}K`] && !get(row,5) && !get(row,6)) moves.push([row,6]);
        if (castling?.[`${color}Q`] && !get(row,3) && !get(row,2) && !get(row,1)) moves.push([row,2]);
      }
      break;
    }
  }
  return moves;
}

// ─── Main component ─────────────────────────────────────────────
export default function ChessGame({ roomId, identity, connected, chat }) {
  const { state, waiting, error, move, promote, offerDraw, acceptDraw, resign, restart } = useChess(roomId, connected);

  const [selected, setSelected]       = useState(null); // [r, c]
  const [legalTargets, setLegalTargets] = useState([]);
  const [showRules, setShowRules]     = useState(false);
  const [showResign, setShowResign]   = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [chatBubbles, setChatBubbles] = useState([]);
  const lastMsgId = useRef(null);

  // Incoming chat → floating bubble
  useEffect(() => {
    if (!chat?.messages?.length) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.kind !== 'message' || lastMsgId.current === last.id) return;
    lastMsgId.current = last.id;
    const bubble = { uid: `${last.id}-${Date.now()}`, name: last.senderName, text: last.text, x: 20 + Math.random() * 60 };
    setChatBubbles(b => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles(b => b.filter(x => x.uid !== bubble.uid)), 3000);
  }, [chat?.messages]);

  // Deselect when it stops being my turn
  useEffect(() => {
    if (!state?.myTurn) { setSelected(null); setLegalTargets([]); }
  }, [state?.myTurn]);

  function handleSend(text) {
    chat?.sendMessage?.(text);
    const bubble = { uid: `own-${Date.now()}`, name: 'You', text, x: 20 + Math.random() * 60 };
    setChatBubbles(b => [...b.slice(-3), bubble]);
    setTimeout(() => setChatBubbles(b => b.filter(x => x.uid !== bubble.uid)), 3000);
  }

  function handleSquareClick(r, c) {
    if (!state?.myTurn || state?.winner) return;

    const clickedPiece = state.board[r][c];
    const clickedColor = clickedPiece ? clickedPiece[0] : null;

    // Clicking one of our own pieces — select it
    if (clickedColor === state.myColor) {
      if (selected && selected[0] === r && selected[1] === c) {
        // Deselect
        setSelected(null);
        setLegalTargets([]);
      } else {
        setSelected([r, c]);
        setLegalTargets(clientLegalMoves(state.board, r, c, state.castling, state.enPassant));
      }
      return;
    }

    // Clicking a legal target square — make the move
    if (selected) {
      const isTarget = legalTargets.some(([tr, tc]) => tr === r && tc === c);
      if (isTarget) {
        move(selected[0], selected[1], r, c);
        setSelected(null);
        setLegalTargets([]);
        return;
      }
    }

    // Clicking empty or enemy with nothing selected — deselect
    setSelected(null);
    setLegalTargets([]);
  }

  /* ── loading ── */
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
      {waiting && <p className="text-xs">Board sets up once your opponent opens Chess.</p>}
    </div>
  );

  const iWon = state.winner && state.winner !== 'draw' && state.winner === identity?.userId;
  const isDraw = state.winner === 'draw';
  const drawOffered = state.log[state.log.length - 1]?.includes('offers a draw');
  const opponentOfferedDraw = drawOffered && !state.myTurn; // rough check

  const promotionForMe = state.promotionPending &&
    state.promotionPending !== 'opponent' &&
    state.promotionPending.color === state.myColor;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-ink-950">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-700 bg-ink-900">
        <button onClick={() => setShowEmoji(v => !v)}
          className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
          <Smile size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-xs tracking-widest text-mist-100">CHESS</span>
          <span className="text-[10px] bg-cipher-700/15 border border-cipher-700/40 text-cipher-500 rounded-full px-2 py-0.5 font-medium">
            {state.scores.mine} – {state.scores.opponent}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => { offerDraw(); }} title="Offer draw"
            className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
            <Handshake size={15} />
          </button>
          <button onClick={() => setShowRules(true)} title="Rules"
            className="p-1.5 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-700 transition-colors cursor-pointer">
            <BookOpen size={15} />
          </button>
          <button onClick={() => setShowResign(true)} title="Resign"
            className="p-1.5 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer">
            <Flag size={15} />
          </button>
        </div>
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <div className="absolute top-12 left-3 z-50">
            <QuickReactBar onPick={emoji => { chat?.sendGameReaction?.(emoji); setShowEmoji(false); }} />
          </div>
        )}
      </AnimatePresence>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-3 py-2 relative">
        <FloatingBubbles bubbles={chatBubbles} />

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 shrink-0">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* Draw offer banner */}
        {opponentOfferedDraw && !state.winner && (
          <div className="shrink-0 flex items-center justify-between gap-2 rounded-xl border border-signal-500/40 bg-signal-700/10 px-3 py-2">
            <p className="text-xs text-signal-400">Opponent offers a draw</p>
            <button onClick={acceptDraw}
              className="text-xs rounded-lg bg-signal-500 text-ink-950 px-3 py-1 font-medium cursor-pointer hover:bg-signal-300 transition-colors">
              Accept
            </button>
          </div>
        )}

        {/* Color + turn indicator */}
        <div className="shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-full border ${state.myColor === 'w' ? 'bg-white border-mist-400' : 'bg-ink-900 border-ink-500'}`} />
            <span className="text-xs text-mist-400">
              You — <b className="text-mist-200">{state.myColor === 'w' ? 'White' : 'Black'}</b>
            </span>
          </div>
          {!state.winner && (
            <span className={`text-[11px] font-display tracking-widest px-2.5 py-0.5 rounded-full ${
              state.myTurn ? 'text-cipher-500 bg-cipher-700/10' : 'text-mist-500 bg-ink-800/50'
            }`}>
              {state.myTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
            </span>
          )}
        </div>

        {/* Game over */}
        {state.winner && (
          <div className="shrink-0 rounded-xl border border-signal-500/40 bg-signal-700/10 p-3 text-center">
            <p className="font-display text-xs text-signal-500 mb-1">
              {isDraw ? "DRAW" : iWon ? "YOU WIN" : "OPPONENT WINS"}
            </p>
            <p className="text-xs text-mist-400 mb-2.5">{state.winReason}</p>
            <button onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 text-ink-950 text-xs font-medium px-3 py-1.5 hover:bg-signal-300 cursor-pointer transition-colors">
              <RotateCcw size={13} /> Rematch
            </button>
          </div>
        )}

        {/* Opponent promotion waiting */}
        {state.promotionPending === 'opponent' && (
          <div className="shrink-0 text-center text-xs text-mist-500 bg-ink-800/40 rounded-lg px-3 py-2">
            Opponent is choosing a promotion piece…
          </div>
        )}

        {/* Board */}
        <div className="shrink-0">
          <Board
            board={state.board}
            myColor={state.myColor}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={state.lastMove}
            onSquareClick={handleSquareClick}
            myTurn={state.myTurn}
            winner={state.winner}
          />
        </div>

        {/* Move log */}
        {state.log.length > 0 && (
          <div className="shrink-0 rounded-lg border border-ink-700/60 bg-ink-800/20 px-3 py-2">
            <p className="text-[10px] text-mist-700 mb-1">Move log</p>
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {state.log.slice(-10).map((l, i) => (
                <p key={i} className="text-[11px] text-mist-500 leading-snug">{l}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CHAT BAR ───────────────────────────────────────────── */}
      <InlineChat onSend={handleSend} />

      {/* ── MODALS ─────────────────────────────────────────────── */}
      {promotionForMe && (
        <PromotionModal color={state.myColor} onPick={promote} />
      )}
      {showRules  && <RulesModal onClose={() => setShowRules(false)} />}
      {showResign && (
        <ResignModal
          onConfirm={() => { resign(); setShowResign(false); }}
          onCancel={() => setShowResign(false)}
        />
      )}
    </div>
  );
}
