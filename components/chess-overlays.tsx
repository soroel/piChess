"use client";

import React, { useEffect, useRef, useState } from "react";
import type { GameState, AiLevel } from "@/lib/chess-engine";
import { getEndMessage } from "@/lib/chess-engine";

/* ════════════════════════════════════════════════════════════
   Canvas end-game particle FX
   win  → gold confetti + burst rings + chess symbols
   draw → grey/silver confetti + starburst lines from centre
   lose → cool-blue slow-rain confetti + blue shockwave
════════════════════════════════════════════════════════════ */
interface Particle {
  x: number; y: number; size: number; color: string;
  vx: number; vy: number; rot: number; rotV: number;
  shape: "rect" | "circle" | "diamond" | "star";
  symbol?: string; opacity: number;
}
interface Ring { x: number; y: number; r: number; maxR: number; speed: number; opacity: number; color: string; }

function EndGameCanvas({ active, type }: { active: boolean; type: "win" | "draw" | "lose" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;

    const winPal  = ["#d4af37","#ffd700","#f5e642","#ffffff","#e8c84a","#ffec8b","#c8a82e","#ffe080"];
    const drawPal = ["#a0a0a0","#c8c8c8","#888888","#e0e0e0","#b0b0b0","#fff8","#d0d0d0"];
    const losePal = ["#3a6080","#4a80a0","#2a4860","#6aaac8","#1e3850","#7ac0d8","#5090b0"];

    const palette = type === "win" ? winPal : type === "draw" ? drawPal : losePal;
    const count   = type === "win" ? 150 : type === "draw" ? 76 : 92;
    const symbols = type === "win"  ? ["♔","♕","♖","★","✦"]
                  : type === "draw" ? ["♞","♝","⚖","∞"]
                  :                   ["♚","♟","✦"];

    const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
      x:       Math.random() * W,
      y:       -20 - Math.random() * 200,
      size:    5 + Math.random() * 14,
      color:   palette[Math.floor(Math.random() * palette.length)],
      vx:      (Math.random() - 0.5) * (type === "lose" ? 2.6 : 7.0),
      vy:      (type === "lose" ? 0.60 : 1.0) + Math.random() * (type === "lose" ? 1.9 : 4.6),
      rot:     Math.random() * Math.PI * 2,
      rotV:    (Math.random() - 0.5) * 0.17,
      shape:   (["rect","circle","diamond","star"] as const)[Math.floor(Math.random() * 4)],
      symbol:  i % 5 === 0 ? symbols[Math.floor(Math.random() * symbols.length)] : undefined,
      opacity: 1,
    }));

    /* Win: 8 burst rings alternating gold and white */
    const rings: Ring[] = type === "win"
      ? Array.from({ length: 8 }, (_, i) => ({
          x: W / 2, y: H * 0.35, r: 0,
          maxR:  88 + i * 72, speed: 2.4 + i * 1.9, opacity: 0.70,
          color: i % 2 === 0 ? "rgba(212,175,55," : "rgba(255,255,255,",
        }))
      : type === "lose"
      ? [{ x: W / 2, y: H * 0.35, r: 0, maxR: W * 0.85, speed: 4.8, opacity: 0.52, color: "rgba(74,128,160," }]
      : [];

    /* Draw: 14 starburst lines from centre */
    const starLines = type === "draw"
      ? Array.from({ length: 14 }, (_, i) => ({
          angle:   (i / 14) * Math.PI * 2,
          length:  0,
          maxLen:  180 + Math.random() * 140,
          speed:   5.2 + Math.random() * 6,
          opacity: 0.50,
        }))
      : [];

    let alive = true;

    function frame() {
      if (!canvas || !ctx || !alive) return;
      ctx.clearRect(0, 0, W, H);

      /* Rings */
      for (const ring of rings) {
        if (ring.r < ring.maxR) {
          ring.r      += ring.speed;
          ring.opacity = Math.max(0, ring.opacity - 0.011);
        }
        if (ring.opacity > 0) {
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = ring.color + ring.opacity + ")";
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
      }

      /* Starburst lines */
      for (const line of starLines) {
        line.length  = Math.min(line.maxLen, line.length + line.speed);
        line.opacity = Math.max(0, line.opacity - 0.005);
        const x0 = W / 2, y0 = H * 0.35;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + Math.cos(line.angle) * line.length, y0 + Math.sin(line.angle) * line.length);
        ctx.strokeStyle = `rgba(180,180,180,${line.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      /* Confetti particles */
      let allGone = true;
      for (const p of particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += type === "lose" ? 0.036 : 0.070;
        p.vx *= type === "lose" ? 0.997 : 0.994;
        p.rot += p.rotV;
        if (p.y < H + 60) allGone = false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - p.y / (H + 60)) * (type === "lose" ? 0.66 : 1);
        ctx.fillStyle   = p.color;

        if (p.symbol) {
          ctx.font = `${p.size * 2.2}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.symbol, 0, 0);
        } else if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "diamond") {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2); ctx.lineTo(p.size / 2, 0);
          ctx.lineTo(0,  p.size / 2); ctx.lineTo(-p.size / 2, 0);
          ctx.closePath(); ctx.fill();
        } else if (p.shape === "star") {
          const oR = p.size / 2, iR = p.size / 4;
          ctx.beginPath();
          for (let k = 0; k < 10; k++) {
            const angle = (k * Math.PI) / 5 - Math.PI / 2;
            const r     = k % 2 === 0 ? oR : iR;
            k === 0
              ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
              : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath(); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      if (!allGone) rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [active, type]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 45 }}
      aria-hidden="true"
    />
  );
}

/* ════════════════════════════════════════════════════════════
   End-reason descriptions — all 7 ways a chess game ends
════════════════════════════════════════════════════════════ */
function reasonDesc(reason: string | null): string {
  switch (reason) {
    case "checkmate":              return "The king has no safe square to escape to.";
    case "stalemate":              return "No legal moves remain, but the king is not in check. Draw by stalemate.";
    case "insufficient-material": return "Neither side has enough pieces left to force checkmate.";
    case "threefold-repetition":  return "The same board position was reached three times.";
    case "fifty-move-rule":       return "50 consecutive moves without a pawn move or capture.";
    case "resign":                return "A player surrendered the game.";
    case "draw-agreement":        return "Both players agreed to end the game as a draw.";
    default: return "";
  }
}

const END_BADGE: Record<string, string> = {
  "checkmate":             "Checkmate",
  "stalemate":             "Stalemate",
  "insufficient-material": "Insufficient Material",
  "threefold-repetition":  "Threefold Repetition",
  "fifty-move-rule":       "50-Move Rule",
  "resign":                "Resignation",
  "draw-agreement":        "Draw by Agreement",
};

/* ════════════════════════════════════════════════════════════
   Game End Modal
════════════════════════════════════════════════════════════ */
export function GameEndModal({ state, playerColor, onNewGame, onRematch, onMainMenu, mode = "ai" }: {
  state:        GameState;
  playerColor:  "w" | "b";
  onNewGame:    () => void;
  onRematch:    () => void;
  onMainMenu?:  () => void;
  mode?:        "ai" | "pvp";
  }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state.status === "ended") {
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [state.status, state.endReason]);

  if (!visible || state.status !== "ended") return null;

  const isWin  = state.winner === playerColor;
  const isDraw = state.winner === "draw";
  const isLose = !isWin && !isDraw;

  const confType = isWin ? "win" : isDraw ? "draw" : "lose";
  const { subtitle } = getEndMessage(state);
  const opponentLabel = mode === "pvp" ? (playerColor === "w" ? "Black" : "White") : "AI";
  const title = isWin ? "You Win!" : isDraw ? "It's a Draw!" : `${opponentLabel} Wins!`;
  const desc  = reasonDesc(state.endReason);

  const accent = isWin ? "#d4af37" : isDraw ? "#aaaaaa" : "#5a90aa";
  const bgGrad = isWin
    ? "linear-gradient(160deg, #0c1020 0%, #1c1800 55%, #181200 100%)"
    : isDraw
    ? "linear-gradient(160deg, #0c1020 0%, #141414 100%)"
    : "linear-gradient(160deg, #0c1020 0%, #07101a 100%)";

  const iconAnim = isWin ? "animate-crown-drop" : isDraw ? "animate-draw-wobble" : "animate-lose-float";
  const icon     = isWin ? "♔" : isDraw ? "♞" : "♚";
  const iconFilt = isWin
    ? "drop-shadow(0 0 38px rgba(212,175,55,1)) drop-shadow(0 0 72px rgba(212,175,55,0.50))"
    : isDraw
    ? "drop-shadow(0 0 26px rgba(160,160,160,0.72))"
    : "drop-shadow(0 0 26px rgba(90,144,170,0.68))";

  const moves    = state.moveHistory.length;
  const captures = state.capturedPieces.w.length + state.capturedPieces.b.length;
  const result   = isWin ? "1 – 0" : isDraw ? "½ – ½" : "0 – 1";

  return (
    <>
      <EndGameCanvas active={visible} type={confType} />

      {/* Win radial glow */}
      {isWin && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex:     48,
            background: "radial-gradient(ellipse 58% 40% at 50% 42%, rgba(212,175,55,0.12) 0%, transparent 70%)",
          }}
        />
      )}

      <div
        className="fixed inset-0 flex items-center justify-center px-5"
        style={{ zIndex: 50, backgroundColor: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Game over: ${title}`}
      >
        <div
          className="animate-modal-in w-full flex flex-col items-center gap-4 text-center rounded-3xl p-6"
          style={{
            background: bgGrad,
            border:     `2px solid ${accent}`,
            boxShadow:  `0 0 100px ${accent}3e, 0 32px 96px rgba(0,0,0,0.97)`,
            maxWidth:   380,
          }}
        >
          {/* Icon */}
          <div className={iconAnim} style={{ fontSize: 82, lineHeight: 1, filter: iconFilt }}>
            {icon}
          </div>

          {/* Title */}
          <div>
            <h2
              className={`font-bold text-balance${isWin ? " text-shimmer animate-winner-glow" : ""}`}
              style={{
                fontSize:      "clamp(26px, 7.5vw, 36px)",
                color:         isWin ? undefined : accent,
                letterSpacing: "-0.022em",
                marginBottom:  subtitle ? 2 : 0,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ color: accent, fontSize: 13, fontWeight: 700, opacity: 0.72, marginBottom: desc ? 4 : 0 }}>
                {subtitle}
              </p>
            )}
            {desc && (
              <p style={{ color: "#5a7888", fontSize: 13, marginTop: 2, lineHeight: 1.64 }}>
                {desc}
              </p>
            )}
          </div>

          {/* End-reason badge */}
          {state.endReason && (
            <div style={{
              padding:       "4px 20px",
              borderRadius:  100,
              background:    `${accent}18`,
              border:        `1.5px solid ${accent}80`,
              color:         accent,
              fontSize:      11.5,
              fontWeight:    700,
              letterSpacing: "0.04em",
            }}>
              {END_BADGE[state.endReason] ?? state.endReason}
            </div>
          )}

          {/* Stats row */}
          <div
            className="flex gap-4 w-full justify-center"
            style={{
              padding:      "10px 18px",
              borderRadius: 14,
              background:   "rgba(255,255,255,0.03)",
              border:       "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {([
              { label: "Moves",    val: String(moves),    color: "#c0a858" },
              { label: "Result",   val: result,           color: accent    },
              { label: "Captures", val: String(captures), color: "#c0a858" },
            ] as const).map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />}
                <div className="flex flex-col items-center gap-0.5">
                  <span style={{ color: "#5a7888", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {s.label}
                  </span>
                  <span style={{ color: s.color, fontSize: 20, fontWeight: 800 }}>{s.val}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onRematch}
              className="flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
              style={{
                background:    `${accent}18`,
                border:        `1.5px solid ${accent}85`,
                color:         accent,
                letterSpacing: "0.02em",
              }}
            >
              Rematch
            </button>
            <button
              onClick={onNewGame}
              className="flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
              style={{
                background:    accent,
                color:         "#07091a",
                border:        `1.5px solid ${accent}`,
                letterSpacing: "0.02em",
              }}
            >
              New Game
            </button>
          </div>

          {/* Main Menu exit */}
          {onMainMenu && (
            <button
              onClick={onMainMenu}
              className="w-full rounded-2xl py-2.5 text-xs font-bold transition-all active:scale-95"
              style={{
                background:    "rgba(255,255,255,0.04)",
                border:        "1px solid rgba(255,255,255,0.09)",
                color:         "#4a6272",
                letterSpacing: "0.03em",
              }}
              aria-label="Return to main menu"
            >
              Main Menu
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   Difficulty Selector
════════════════════════════════════════════════════════════ */
const LEVELS: { key: AiLevel; label: string; desc: string; color: string }[] = [
  { key: "beginner", label: "Beginner", desc: "Random moves — great for learning",    color: "#4ade80" },
  { key: "easy",     label: "Easy",     desc: "Simple tactics, allows mistakes",       color: "#86efac" },
  { key: "medium",   label: "Medium",   desc: "Balanced play, thinks ahead",           color: "#d4af37" },
  { key: "hard",     label: "Hard",     desc: "Strong strategy, few errors",           color: "#fb923c" },
  { key: "expert",   label: "Expert",   desc: "Near-perfect play — hardest challenge", color: "#f87171" },
];

export function DifficultySelector({ current, onChange }: { current: AiLevel; onChange: (l: AiLevel) => void }) {
  return (
    <div className="flex gap-1.5 justify-center flex-wrap">
      {LEVELS.map(l => (
        <button
          key={l.key}
          onClick={() => onChange(l.key)}
          title={l.desc}
          aria-pressed={current === l.key}
          className="rounded-xl transition-all active:scale-95"
          style={{
            padding:       "5px 14px",
            fontSize:      "clamp(10px, 2.8vw, 12px)",
            fontWeight:    700,
            background:    current === l.key ? `${l.color}1c` : "rgba(255,255,255,0.04)",
            border:        `1.5px solid ${current === l.key ? l.color : "rgba(255,255,255,0.09)"}`,
            color:         current === l.key ? l.color : "#4a6272",
            letterSpacing: "0.025em",
            transition:    "all 0.18s ease",
            boxShadow:     current === l.key ? `0 0 14px ${l.color}28` : "none",
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Tutorial / Onboarding Prompt — 5 steps, fully dismissable
════════════════════════════════════════════════════════════ */
const STEPS = [
  {
    icon:  "♔",
    title: "Welcome to Chess!",
    body:  "You play as White against the AI. Your goal is to checkmate the opponent's King — trap it so it has no safe square to escape to.",
    tip:   "You can close this guide at any time with the X button above, or tap the dimmed area behind it.",
    color: "#d4af37",
  },
  {
    icon:  "♟",
    title: "Selecting & Moving",
    body:  "Tap any of your pieces to select it.\n\nGreen dots show empty squares you can move to. A pulsing gold ring marks squares where you can capture an enemy piece.\n\nTap a highlighted square to make your move.",
    tip:   "Tap the same piece again to deselect it, or tap a different piece to switch selection.",
    color: "#4ade80",
  },
  {
    icon:  "♛",
    title: "Special Moves",
    body:  "Castling — move your King 2 squares toward a Rook (neither can have moved before, no pieces in between, no squares under attack).\n\nEn Passant — capture a pawn that just moved 2 squares past yours on the very next move only.\n\nPromotion — when your pawn reaches the last rank, choose a Queen, Rook, Bishop, or Knight.",
    tip:   "Castling shows up as a regular King move in the legal-move dots.",
    color: "#a78bfa",
  },
  {
    icon:  "⚠",
    title: "Check & Checkmate",
    body:  "If your King is under attack you are in Check — the King's square flashes red. You must escape: move the King, block the attacker, or capture it.\n\nIf there is no legal escape, it is Checkmate and the game ends.",
    tip:   "You cannot make any move that leaves your own King in check.",
    color: "#f87171",
  },
  {
    icon:  "♞",
    title: "How the Game Ends",
    body:  "Win — checkmate the AI's King.\n\nDraw — stalemate (no legal moves, not in check), insufficient material (too few pieces to force mate), threefold repetition, or the 50-move rule.\n\nResign — tap the Resign button at any time to concede the game.",
    tip:   "You can change the AI difficulty level at any time, even mid-game.",
    color: "#fb923c",
  },
];

export function TutorialPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const cur    = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 60, padding: "0 14px max(18px,env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Chess tutorial, step ${step + 1} of ${STEPS.length}`}
    >
      {/* Tap backdrop to dismiss */}
      <button
        className="absolute inset-0 w-full h-full"
        style={{
          background:    "rgba(0,0,0,0.70)",
          backdropFilter:"blur(4px)",
          border:        "none",
          cursor:        "default",
        }}
        onClick={onDismiss}
        aria-label="Close tutorial"
        tabIndex={-1}
      />

      <div
        className="animate-slide-up-fade relative w-full rounded-3xl p-5"
        style={{
          maxWidth:   440,
          background: "linear-gradient(160deg, #0c1220 0%, #101828 100%)",
          border:     `2px solid ${cur.color}50`,
          boxShadow:  `0 -4px 56px ${cur.color}1e, 0 24px 72px rgba(0,0,0,0.97)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-3.5 right-3.5 flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            width:      30,
            height:     30,
            background: "rgba(255,255,255,0.07)",
            border:     "1px solid rgba(255,255,255,0.12)",
            color:      "#4a6272",
            fontSize:   12,
          }}
          aria-label="Close tutorial"
        >
          &#x2715;
        </button>

        {/* Step counter */}
        <p style={{ color: cur.color, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 10 }}>
          Guide &middot; {step + 1}&thinsp;/&thinsp;{STEPS.length}
        </p>

        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", marginBottom: 14, overflow: "hidden" }}>
          <div
            style={{
              height:       "100%",
              borderRadius: 2,
              background:   cur.color,
              width:        `${((step + 1) / STEPS.length) * 100}%`,
              transition:   "width 0.32s ease",
            }}
          />
        </div>

        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>{cur.icon}</span>
          <h3 style={{ color: "#e8dfc0", fontSize: 17, fontWeight: 800, lineHeight: 1.22 }}>
            {cur.title}
          </h3>
        </div>

        {/* Body */}
        <p style={{ color: "#6a8498", fontSize: 13, lineHeight: 1.76, marginBottom: 10, whiteSpace: "pre-line" }}>
          {cur.body}
        </p>

        {/* Tip pill */}
        <div style={{
          background:   `${cur.color}0d`,
          border:       `1px solid ${cur.color}2a`,
          borderRadius: 12,
          padding:      "7px 12px",
          marginBottom: 14,
        }}>
          <p style={{ color: "#7a8fa8", fontSize: 12, lineHeight: 1.62 }}>
            <span style={{ fontWeight: 700, color: cur.color }}>Tip: </span>
            {cur.tip}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              style={{
                width:        i === step ? 28 : 8,
                height:       8,
                borderRadius: 4,
                background:   i === step ? cur.color : "rgba(255,255,255,0.11)",
                border:       "none",
                cursor:       "pointer",
                transition:   "all 0.22s ease",
                padding:      0,
              }}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.05)",
                border:     "1px solid rgba(255,255,255,0.10)",
                color:      "#6a7f90",
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? onDismiss : () => setStep(s => s + 1)}
            className="flex-1 rounded-2xl py-2.5 text-sm font-bold transition-all active:scale-95"
            style={{
              background: isLast ? cur.color : `${cur.color}22`,
              border:     `1.5px solid ${cur.color}`,
              color:      isLast ? "#07091a" : cur.color,
            }}
          >
            {isLast ? "Start Playing!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Promotion Modal
════════════════════════════════════════════════════════════ */
const PROMOTE: Array<{ type: "Q" | "R" | "B" | "N"; label: string }> = [
  { type: "Q", label: "Queen"  },
  { type: "R", label: "Rook"   },
  { type: "B", label: "Bishop" },
  { type: "N", label: "Knight" },
];
const PROMO_UNICODE: Record<string, string> = {
  wQ:"♕", wR:"♖", wB:"♗", wN:"♘",
  bQ:"♛", bR:"♜", bB:"♝", bN:"♞",
};

export function PromotionModal({ color, onSelect }: { color: "w" | "b"; onSelect: (p: "Q" | "R" | "B" | "N") => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 55, backgroundColor: "rgba(0,0,0,0.92)", backdropFilter: "blur(9px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
    >
      <div
        className="animate-modal-in rounded-3xl p-5 flex flex-col items-center gap-4 w-full"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:   330,
          background: "linear-gradient(160deg, #0d1220 0%, #111828 100%)",
          border:     "2px solid #d4af37",
          boxShadow:  "0 0 90px rgba(212,175,55,0.44)",
        }}
      >
        <div>
          <h3 style={{ color: "#d4af37", fontSize: 18, fontWeight: 800, textAlign: "center" }}>
            Promote Your Pawn
          </h3>
          <p style={{ color: "#4a6272", fontSize: 12, textAlign: "center", marginTop: 4 }}>
            Select a piece to replace your pawn
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 w-full">
          {PROMOTE.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-all active:scale-95"
              style={{ background: "rgba(212,175,55,0.07)", border: "1.5px solid rgba(212,175,55,0.28)" }}
              aria-label={`Promote to ${label}`}
            >
              <span style={{ fontSize: 38, lineHeight: 1 }}>{PROMO_UNICODE[color + type]}</span>
              <span style={{ color: "#5a7888", fontSize: 10, fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Resign Confirm
════════════════════════════════════════════════════════════ */
export function ResignConfirm({ onConfirm, onCancel, mode = "ai" }: { onConfirm: () => void; onCancel: () => void; mode?: "ai" | "pvp" }) {
  const opponentName = mode === "pvp" ? "your opponent" : "the AI";
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 55, backgroundColor: "rgba(0,0,0,0.86)", backdropFilter: "blur(7px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm resignation"
      onClick={onCancel}
    >
      <div
        className="animate-modal-in rounded-3xl p-5 w-full flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:   330,
          background: "linear-gradient(160deg, #0d1220 0%, #111828 100%)",
          border:     "2px solid rgba(239,68,68,0.48)",
          boxShadow:  "0 0 60px rgba(239,68,68,0.20)",
        }}
      >
        <div className="text-center">
          <div className="animate-resign-bounce" style={{ fontSize: 48, marginBottom: 8 }}>&#9817;</div>
          <h3 style={{ color: "#f87171", fontSize: 19, fontWeight: 800 }}>Resign the Game?</h3>
          <p style={{ color: "#4a6272", fontSize: 13, marginTop: 6, lineHeight: 1.62 }}>
            Are you sure you want to surrender? {opponentName.charAt(0).toUpperCase() + opponentName.slice(1)} will be declared the winner.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "#6a7f90" }}
          >
            Keep Playing
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
            style={{ background: "rgba(239,68,68,0.14)", border: "1.5px solid #f87171", color: "#f87171" }}
          >
            Resign
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Move History strip
════════════════════════════════════════════════════════════ */
export function MoveHistory({ moves }: { moves: Array<{ notation?: string }> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [moves]);

  const pairs: string[][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i]?.notation ?? "", moves[i + 1]?.notation ?? ""]);
  }

  return (
    <div
      ref={ref}
      className="flex gap-1 overflow-x-auto items-center"
      style={{ scrollbarWidth: "none", minHeight: 24 }}
    >
      {pairs.length === 0 ? (
        <span style={{ color: "#4a6272", fontSize: 11, padding: "2px 4px" }}>No moves yet</span>
      ) : (
        pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-0.5 shrink-0">
            <span style={{ color: "#4a6272", fontSize: 10, minWidth: 14, textAlign: "right", fontFamily: "monospace" }}>
              {i + 1}.
            </span>
            <span style={{
              background:   "rgba(255,255,255,0.05)",
              border:       "1px solid rgba(255,255,255,0.085)",
              borderRadius: 5,
              padding:      "1.5px 5px",
              fontSize:     11.5,
              color:        "#9ab4c8",
              fontFamily:   "monospace",
              minWidth:     30,
              textAlign:    "center",
            }}>
              {pair[0]}
            </span>
            {pair[1] && (
              <span style={{
                background:   "rgba(255,255,255,0.03)",
                border:       "1px solid rgba(255,255,255,0.055)",
                borderRadius: 5,
                padding:      "1.5px 5px",
                fontSize:     11.5,
                color:        "#5a7888",
                fontFamily:   "monospace",
                minWidth:     30,
                textAlign:    "center",
              }}>
                {pair[1]}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Captured Pieces
════════════════════════════════════════════════════════════ */
const CAP_UNICODE: Record<string, string> = {
  wK:"♔", wQ:"♕", wR:"♖", wB:"♗", wN:"♘", wP:"♙",
  bK:"♚", bQ:"♛", bR:"♜", bB:"♝", bN:"♞", bP:"♟",
};
const PVAL: Record<string, number> = { Q: 9, R: 5, B: 3, N: 3, P: 1, K: 0 };

export function CapturedPieces({
  captured,
}: {
  captured: { type: string; color: string }[];  // accepts Piece[] or plain objects
}) {
  const sorted = [...captured].sort((a, b) => (PVAL[b.type] ?? 0) - (PVAL[a.type] ?? 0));
  const score  = sorted.reduce((s, p) => s + (PVAL[p.type] ?? 0), 0);
  if (sorted.length === 0) return <div style={{ height: 15 }} />;
  return (
    <div className="flex items-center gap-0.5 flex-wrap" style={{ minHeight: 15 }}>
      {sorted.map((p, i) => (
        <span key={i} style={{ fontSize: 11, opacity: 0.56, lineHeight: 1 }}>
          {CAP_UNICODE[p.color + p.type]}
        </span>
      ))}
      {score > 0 && (
        <span style={{ color: "#d4af37", fontSize: 9.5, fontWeight: 700, marginLeft: 2 }}>+{score}</span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Status Bar
════════════════════════════════════════════════════════════ */
export function StatusBar({ state, isAiThinking, playerColor, mode = "ai" }: {
  state:        GameState;
  isAiThinking: boolean;
  playerColor:  "w" | "b";
  mode?:        "ai" | "pvp";
}) {
  if (state.status === "ended") return null;

  const isPlayerTurn = state.turn === playerColor;
  const inCheck      = state.inCheck;
  const opponentName = mode === "pvp" ? (playerColor === "w" ? "Black" : "White") : "AI";

  let msg:   string;
  let color: string;
  let flash  = false;

  if      (inCheck && isPlayerTurn)  { msg = "You are in check — you must escape!";      color = "#f87171"; flash = true; }
  else if (inCheck && !isPlayerTurn) { msg = `${opponentName} is in check!`;             color = "#4ade80"; }
  else if (isAiThinking)             { msg = "AI is thinking...";                        color = "#d4af37"; }
  else if (isPlayerTurn)             { msg = "Your turn — select a piece";               color = "#d4af37"; }
  else                               { msg = mode === "pvp" ? "Waiting for opponent..." : "Waiting for AI..."; color = "#4a6272"; }

  return (
    <div
      className="flex items-center justify-center gap-2 rounded-xl py-1.5 px-3"
      style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {inCheck && isPlayerTurn && (
        <div style={{
          width:        7,
          height:       7,
          borderRadius: "50%",
          background:   "#f87171",
          boxShadow:    "0 0 8px #f87171",
          flexShrink:   0,
        }} />
      )}
      {isAiThinking && !inCheck && (
        <div className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width:        4,
              height:       4,
              borderRadius: "50%",
              background:   "#d4af37",
              animation:    `bounce-dot 0.72s ease-in-out ${i * 0.16}s infinite`,
            }} />
          ))}
        </div>
      )}
      <span
        className={flash ? "animate-status-flash" : undefined}
        style={{ fontSize: 12, color, fontWeight: 600 }}
      >
        {msg}
      </span>
    </div>
  );
}
