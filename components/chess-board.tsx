"use client";

import React, { useMemo } from "react";
import type { Move, GameState, Piece } from "@/lib/chess-engine";

export type BoardTheme = "classic" | "walnut" | "emerald" | "slate" | "rose" | "midnight";

interface BoardColors { light: string; dark: string; }
export const BOARD_THEMES: Record<BoardTheme, BoardColors> = {
  classic:  { light: "#e8d5a5", dark: "#4c6f8a" },
  walnut:   { light: "#f0d8a8", dark: "#8b5e3c" },
  emerald:  { light: "#d8e8d0", dark: "#3a6b4a" },
  slate:    { light: "#d4d8e0", dark: "#4a5568" },
  rose:     { light: "#f0d8d8", dark: "#8b3a5a" },
  midnight: { light: "#c8c0e0", dark: "#2e2460" },
};

interface ChessBoardProps {
  state:          GameState;
  selectedSquare: [number, number] | null;
  legalMoves:     Move[];
  lastMove:       Move | null;
  playerColor:    "w" | "b";
  onSquareClick:  (row: number, col: number) => void;
  disabled?:      boolean;
  boardTheme?:    BoardTheme;
  customColors?:  { light: string; dark: string } | null;
}

const UNICODE: Record<string, string> = {
  wK:"♔", wQ:"♕", wR:"♖", wB:"♗", wN:"♘", wP:"♙",
  bK:"♚", bQ:"♛", bR:"♜", bB:"♝", bN:"♞", bP:"♟",
};

function PieceSymbol({ piece, isSelected }: { piece: Piece; isSelected: boolean }) {
  const isW = piece.color === "w";
  const sym = UNICODE[piece.color + piece.type];
  const baseFilter = isW
    ? "drop-shadow(0 1px 6px rgba(0,0,0,0.95)) drop-shadow(0 2px 10px rgba(0,0,0,0.7))"
    : "drop-shadow(0 1px 4px rgba(0,0,0,0.65))";
  const selFilter =
    "drop-shadow(0 0 16px rgba(212,175,55,1)) drop-shadow(0 0 32px rgba(212,175,55,0.55))";
  return (
    <span
      className={`chess-piece select-none${isSelected ? " selected animate-piece-select" : ""}`}
      style={{
        fontSize:         "clamp(18px, 5.4vw, 42px)",
        display:          "block",
        textAlign:        "center",
        lineHeight:       1,
        color:            isW ? "#f5efe0" : "#161228",
        WebkitTextStroke: isW
          ? (isSelected ? "0.9px rgba(212,175,55,0.95)" : "0.6px rgba(60,40,10,0.68)")
          : (isSelected ? "0.9px rgba(212,175,55,0.90)" : "0.5px rgba(200,168,50,0.45)"),
        filter:        isSelected ? selFilter : baseFilter,
        transition:    "filter 0.13s ease",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {sym}
    </span>
  );
}

function LegalMoveDot({ isCapture }: { isCapture: boolean }) {
  if (isCapture) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 2, boxShadow: "inset 0 0 0 3.5px rgba(0,0,0,0.22)" }}
        />
        <div
          className="pulse-ring-anim absolute inset-0 pointer-events-none rounded-sm"
          style={{ border: "2.5px solid rgba(212,175,55,0.48)", zIndex: 3 }}
        />
      </>
    );
  }
  return (
    <div
      className="legal-dot absolute pointer-events-none"
      style={{
        width: "31%", height: "31%", borderRadius: "50%",
        backgroundColor: "rgba(0,0,0,0.26)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 2, boxShadow: "0 0 5px rgba(0,0,0,0.28)",
      }}
    />
  );
}

export function ChessBoard({
  state, selectedSquare, legalMoves, lastMove,
  playerColor, onSquareClick, disabled = false,
  boardTheme = "classic",
  customColors,
}: ChessBoardProps) {

  const colors = customColors ?? BOARD_THEMES[boardTheme];

  const legalSet = useMemo(
    () => new Set(legalMoves.map(m => `${m.to[0]},${m.to[1]}`)),
    [legalMoves]
  );
  const captureSet = useMemo(
    () => new Set(
      legalMoves
        .filter(m => state.board[m.to[0]][m.to[1]] !== null || m.isEnPassant)
        .map(m => `${m.to[0]},${m.to[1]}`)
    ),
    [legalMoves, state.board]
  );
  const lastMoveSet = useMemo(() => {
    if (!lastMove) return new Set<string>();
    return new Set([`${lastMove.from[0]},${lastMove.from[1]}`, `${lastMove.to[0]},${lastMove.to[1]}`]);
  }, [lastMove]);

  const kingCheckKey = useMemo(() => {
    if (!state.inCheck) return null;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (state.board[r][c]?.type === "K" && state.board[r][c]?.color === state.turn)
          return `${r},${c}`;
    return null;
  }, [state.inCheck, state.turn, state.board]);

  const ranks = playerColor === "w" ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols  = playerColor === "w" ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const files = playerColor === "w" ? "abcdefgh" : "hgfedcba";

  return (
    <div
      className="chess-board-container w-full"
      style={{ maxWidth: "min(calc(100vw - 24px), 448px)", margin: "0 auto" }}
    >
      <div
        className="animate-board-appear w-full rounded-2xl overflow-hidden"
        style={{
          aspectRatio: "1 / 1",
          boxShadow: [
            "0 0 0 2.5px #d4af37",
            "0 0 0 5px #060810",
            "0 0 0 6.5px rgba(212,175,55,0.28)",
            "0 16px 80px rgba(0,0,0,0.94)",
            "0 0 130px rgba(212,175,55,0.06)",
          ].join(", "),
        }}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "14px 1fr",
          gridTemplateRows:    "1fr 14px",
          width:  "100%",
          height: "100%",
        }}>
          {/* Rank labels */}
          <div style={{ display: "flex", flexDirection: "column", background: "#060810" }}>
            {ranks.map(r => (
              <div key={r} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "clamp(5px,1.55vw,9px)", color: "#d4af37", fontWeight: 700, opacity: 0.58, fontFamily: "monospace", lineHeight: 1 }}>
                  {8 - r}
                </span>
              </div>
            ))}
          </div>

          {/* 8x8 grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(8,1fr)",
            gridTemplateRows:    "repeat(8,1fr)",
            width: "100%", height: "100%",
          }}>
            {ranks.map(r => cols.map(c => {
              const key     = `${r},${c}`;
              const isLight = (r + c) % 2 === 0;
              const piece   = state.board[r][c];
              const isSel   = selectedSquare?.[0] === r && selectedSquare?.[1] === c;
              const isLegal = legalSet.has(key);
              const isCap   = captureSet.has(key);
              const isLast  = lastMoveSet.has(key);
              const isCheck = kingCheckKey === key;

              let bg: string;
              if      (isCheck)          { bg = isLight ? "rgba(220,38,38,0.92)" : "rgba(180,26,26,0.88)"; }
              else if (isSel)            { bg = isLight ? "rgba(234,179,8,0.88)"  : "rgba(212,158,0,0.76)"; }
              else if (isLast && !isSel) { bg = isLight ? "rgba(132,238,170,0.48)" : "rgba(102,212,142,0.34)"; }
              else                       { bg = isLight ? colors.light : colors.dark; }

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`${files[cols.indexOf(c)]}${8 - r}${piece ? ` — ${piece.color === "w" ? "White" : "Black"} ${piece.type}` : ""}`}
                  onClick={() => !disabled && onSquareClick(r, c)}
                  onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !disabled) onSquareClick(r, c); }}
                  className={`relative flex items-center justify-center focus:outline-none select-none${isCheck ? " animate-check-pulse" : ""}`}
                  style={{
                    backgroundColor: bg,
                    cursor:     disabled ? "default" : "pointer",
                    transition: "background-color 0.35s ease",
                  }}
                >
                  {!isLight && !isSel && !isCheck && !isLast && (
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(0,0,0,0.16) 0%,transparent 52%)", pointerEvents: "none" }} />
                  )}
                  {isSel && (
                    <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 2.5px rgba(212,175,55,0.82)", pointerEvents: "none", zIndex: 1 }} />
                  )}
                  {isLegal && <LegalMoveDot isCapture={isCap} />}
                  {piece && <PieceSymbol piece={piece} isSelected={isSel} />}
                </div>
              );
            }))}
          </div>

          {/* Corner filler */}
          <div style={{ background: "#060810" }} />

          {/* File labels */}
          <div style={{ display: "flex", background: "#060810" }}>
            {files.split("").map((f, i) => (
              <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "clamp(5px,1.55vw,9px)", color: "#d4af37", fontWeight: 700, opacity: 0.58, fontFamily: "monospace", lineHeight: 1 }}>
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
