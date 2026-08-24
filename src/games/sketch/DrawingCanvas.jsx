import { useEffect, useRef, useState, useCallback } from 'react';

// Logical drawing-space resolution — canvas is scaled to fit any screen via
// CSS, but every point is normalized to [0,1] before it ever leaves this
// component, so both players' canvases line up regardless of screen size.
const LOGICAL_W = 800;
const LOGICAL_H = 600;
const FLUSH_MS = 45; // how often buffered points are sent to the server

export default function DrawingCanvas({ strokes, isDrawer, color, size, roundKey, onStroke, bgColor }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [renderStrokes, setRenderStrokes] = useState(strokes || []);
  const isPointerDown = useRef(false);
  const pendingBuffer = useRef([]);
  const flushTimer = useRef(null);
  const isFirstFlush = useRef(true);

  // Sync from server state, except mid-gesture (so our own live line isn't
  // interrupted by the round-trip echo of the previous flush).
  useEffect(() => {
    if (isPointerDown.current) return;
    setRenderStrokes(strokes || []);
  }, [strokes]);

  // New round → fresh board.
  useEffect(() => {
    setRenderStrokes([]);
    pendingBuffer.current = [];
    isFirstFlush.current = true;
  }, [roundKey]);

  // Keep a stable ref to redraw so the resize observer always calls
  // the latest version without needing to re-run the resize effect.
  const redrawRef = useRef(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = bgColor || '#ffffff';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    for (const stroke of renderStrokes) {
      const pts = stroke.points;
      if (!pts || pts.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x * LOGICAL_W, pts[0].y * LOGICAL_H);
      if (pts.length === 1) {
        ctx.lineTo(pts[0].x * LOGICAL_W + 0.01, pts[0].y * LOGICAL_H + 0.01);
      } else {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x * LOGICAL_W, pts[i].y * LOGICAL_H);
        }
      }
      ctx.stroke();
    }
  }, [renderStrokes, bgColor]);

  // Keep ref in sync so resize observer always uses latest redraw
  redrawRef.current = redraw;

  // Size the backing buffer for device pixel ratio, keep CSS size responsive.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = wrap.clientWidth;
      const cssH = cssW * (LOGICAL_H / LOGICAL_W);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = LOGICAL_W * dpr;
      canvas.height = LOGICAL_H * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawRef.current?.();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { redraw(); }, [redraw]);

  function flush(final = false) {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    if (pendingBuffer.current.length === 0) return;
    const pts = pendingBuffer.current;
    pendingBuffer.current = [];
    onStroke(pts, color, size, isFirstFlush.current);
    isFirstFlush.current = false;
    if (!final && isPointerDown.current) {
      flushTimer.current = setTimeout(() => flush(), FLUSH_MS);
    }
  }

  function pointFromEvent(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function appendLocalPoint(pt, newStroke) {
    setRenderStrokes((prev) => {
      if (newStroke || prev.length === 0) {
        return [...prev, { color, size, points: [pt] }];
      }
      const next = prev.slice();
      const last = { ...next[next.length - 1] };
      last.points = [...last.points, pt];
      next[next.length - 1] = last;
      return next;
    });
  }

  function handlePointerDown(e) {
    if (!isDrawer) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    isPointerDown.current = true;
    isFirstFlush.current = true;
    const pt = pointFromEvent(e);
    appendLocalPoint(pt, true);
    pendingBuffer.current = [pt];
    flush();
  }

  function handlePointerMove(e) {
    if (!isDrawer || !isPointerDown.current) return;
    e.preventDefault();
    const pt = pointFromEvent(e);
    appendLocalPoint(pt, false);
    pendingBuffer.current.push(pt);
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(() => flush(), FLUSH_MS);
    }
  }

  function handlePointerUp(e) {
    if (!isDrawer) return;
    isPointerDown.current = false;
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
    flush(true);
  }

  return (
    <div ref={wrapRef} className="w-full rounded-xl overflow-hidden border-2 border-ink-600 shadow-inner shrink-0" style={{ background: bgColor || '#ffffff' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`block w-full h-auto touch-none select-none ${isDrawer ? 'cursor-crosshair' : 'cursor-default'}`}
      />
    </div>
  );
}
