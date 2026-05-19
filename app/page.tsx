"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ChessBackground, type BgTheme }        from "@/components/chess-background";
import { ChessBoard, type BoardTheme }           from "@/components/chess-board";
import { SettingsPanel, type AppTheme }          from "@/components/settings-panel";
import { ModeSelect, PvpLobby, type ModeSelectSettingsProps } from "@/components/mode-select";
import {
  GameEndModal,
  DifficultySelector,
  TutorialPrompt,
  PromotionModal,
  ResignConfirm,
  MoveHistory,
  CapturedPieces,
  StatusBar,
} from "@/components/chess-overlays";
import {
  createInitialState,
  getLegalMoves,
  applyMove,
  getBestMove,
  type GameState,
  type Move,
  type AiLevel,
  type PieceType,
} from "@/lib/chess-engine";
import { usePvp }               from "@/hooks/use-pvp";
import { useUser, type Friend } from "@/hooks/use-user";

const LEVEL_COLORS: Record<AiLevel, string> = {
  beginner: "#4ade80",
  easy:     "#86efac",
  medium:   "#d4af37",
  hard:     "#fb923c",
  expert:   "#f87171",
};

/* ════════════════════════════════════════════════════════════
   Player Panel
════════════════════════════════════════════════════════════ */
function PlayerPanel({
  avatar, name, badge, badgeColor, captured,
  isActive, isThinking, showResign, onResign,
}: {
  avatar:      string;
  name:        string;
  badge?:      string;
  badgeColor?: string;
  captured:    { type: string; color: string }[];
  isActive:    boolean;
  isThinking?: boolean;
  showResign?: boolean;
  onResign?:   () => void;
}) {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        background:     "rgba(255,255,255,0.026)",
        border:         `1.5px solid ${isActive ? "rgba(212,175,55,0.48)" : "rgba(255,255,255,0.07)"}`,
        backdropFilter: "blur(6px)",
        boxShadow:      isActive ? "0 0 28px rgba(212,175,55,0.08)" : "none",
        transition:     "border-color 0.28s ease, box-shadow 0.28s ease",
        borderRadius:   18,
        padding:        "8px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width:          34,
            height:         34,
            borderRadius:   "50%",
            background:     avatar === "♚" ? "#0c1020" : "#f5efe0",
            border:         `1.5px solid ${isActive ? "rgba(212,175,55,0.52)" : "rgba(212,175,55,0.20)"}`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       20,
            color:          avatar === "♚" ? "#e8dfc0" : "#1a1200",
            flexShrink:     0,
            animation:      isThinking ? "thinking-glow 1.2s ease-in-out infinite" : undefined,
            transition:     "box-shadow 0.28s ease",
          }}
        >
          {avatar}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
            <span style={{ color: "#e8dfc0", fontSize: 13, fontWeight: 700 }}>{name}</span>
            {badge && badgeColor && (
              <span style={{
                fontSize:      10,
                fontWeight:    700,
                padding:       "1px 7px",
                borderRadius:  100,
                background:    `${badgeColor}18`,
                border:        `1px solid ${badgeColor}55`,
                color:         badgeColor,
                textTransform: "capitalize",
                letterSpacing: "0.03em",
              }}>
                {badge}
              </span>
            )}
          </div>
          <CapturedPieces captured={captured} />
        </div>
      </div>

      {isThinking && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }} aria-label="Thinking">
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width:        5,
              height:       5,
              borderRadius: "50%",
              background:   "#d4af37",
              animation:    `bounce-dot 0.72s ease-in-out ${i * 0.16}s infinite`,
            }} />
          ))}
        </div>
      )}

      {showResign && onResign && (
        <button
          onClick={onResign}
          className="rounded-xl transition-all active:scale-95"
          style={{
            padding:       "5px 11px",
            fontSize:      11,
            fontWeight:    700,
            background:    "rgba(239,68,68,0.08)",
            border:        "1px solid rgba(239,68,68,0.28)",
            color:         "#f87171",
            letterSpacing: "0.02em",
          }}
          aria-label="Resign game"
        >
          Resign
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Main page
════════════════════════════════════════════════════════════ */
export default function ChessPage() {
  type AppMode = "select" | "ai" | "pvp";
  const [appMode, setAppMode] = useState<AppMode>("select");

  /* ── User identity ── */
  const user = useUser();

  /* ── Theme state — lazily initialised from saved prefs ── */
  const [boardTheme,       setBoardTheme]       = useState<BoardTheme>(user.prefs.boardTheme);
  const [customBoard,      setCustomBoard]      = useState<{ light: string; dark: string } | null>(user.prefs.customBoard);
  const [bgTheme,          setBgTheme]          = useState<BgTheme>(user.prefs.bgTheme);
  const [customBgColor,    setCustomBgColor]    = useState<string | null>(user.prefs.customBgColor);
  const [customBgImage,    setCustomBgImage]    = useState<string | null>(user.prefs.customBgImage);
  const [customTextColor,  setCustomTextColor]  = useState<string | null>(user.prefs.customTextColor);
  const [appTheme,         setAppTheme]         = useState<AppTheme>(user.prefs.appTheme);
  const [showSettings,  setShowSettings]  = useState(false);
  const gameSettingsRef    = useRef<HTMLDivElement>(null);
  const gameSettingsBtnRef = useRef<HTMLButtonElement>(null);

  /* ── AI game state ── */
  const [aiGameState,      setAiGameState]      = useState<GameState>(createInitialState);
  const [selected,         setSelected]         = useState<[number, number] | null>(null);
  const [legalMoves,       setLegalMoves]       = useState<Move[]>([]);
  const [aiLevel,          setAiLevel]          = useState<AiLevel>("medium");
  const [isAiThinking,     setIsAiThinking]     = useState(false);
  const [showTutorial,     setShowTutorial]     = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<Move | null>(null);
  const [showResign,       setShowResign]       = useState(false);
  const [lastMove,         setLastMove]         = useState<Move | null>(null);

  /* ── PvP ── */
  const { pvp, createRoom, joinRoom, sendMove, sendResign, leaveRoom } = usePvp();

  const isAiMode  = appMode === "ai";
  const isPvpMode = appMode === "pvp";

  const PLAYER: "w" | "b"    = isAiMode ? "w" : (pvp.playerColor ?? "w");
  const AI_COLOR: "w" | "b"  = PLAYER === "w" ? "b" : "w";
  const gameState             = isAiMode ? aiGameState : (pvp.gameState ?? createInitialState());

  /* ── AI timer refs ── */
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingRef = useRef(false);
  const stateRef    = useRef(aiGameState);
  const levelRef    = useRef(aiLevel);

  useEffect(() => { stateRef.current = aiGameState; }, [aiGameState]);
  useEffect(() => { levelRef.current = aiLevel; },    [aiLevel]);

  /* ── AI turn ── */
  useEffect(() => {
    if (!isAiMode)                           return;
    if (aiGameState.status !== "playing")    return;
    if (aiGameState.turn   !== AI_COLOR)     return;
    if (thinkingRef.current)                 return;
    if (pendingPromotion)                    return;

    thinkingRef.current = true;
    setIsAiThinking(true);
    const delay = 120 + Math.random() * 260;

    timerRef.current = setTimeout(() => {
      const move = getBestMove(stateRef.current, levelRef.current);
      if (move) {
        const next = applyMove(stateRef.current, move);
        setLastMove(move);
        setAiGameState(next);
      }
      thinkingRef.current = false;
      setIsAiThinking(false);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      thinkingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiGameState.turn, aiGameState.status, pendingPromotion, isAiMode]);

  /* ── Square click ── */
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.status !== "playing")     return;
    if (gameState.turn   !== PLAYER)        return;
    if (isAiThinking && isAiMode)           return;
    if (pendingPromotion)                   return;

    const clickedPiece = gameState.board[row][col];

    if (selected) {
      const [sr, sc] = selected;
      if (sr === row && sc === col) { setSelected(null); setLegalMoves([]); return; }

      const target = legalMoves.find(m => m.to[0] === row && m.to[1] === col);
      if (target) {
        if (target.isPromotion) {
          setPendingPromotion({ ...target }); setSelected(null); setLegalMoves([]); return;
        }
        if (isAiMode) {
          const next = applyMove(gameState, target);
          setLastMove(target); setAiGameState(next);
        } else {
          sendMove(target);
          setLastMove(target);
        }
        setSelected(null); setLegalMoves([]); return;
      }

      if (clickedPiece?.color === PLAYER) {
        const moves = getLegalMoves(gameState, row, col);
        setSelected([row, col]); setLegalMoves(moves); return;
      }
      setSelected(null); setLegalMoves([]); return;
    }

    if (clickedPiece?.color === PLAYER) {
      const moves = getLegalMoves(gameState, row, col);
      setSelected([row, col]); setLegalMoves(moves);
    }
  }, [gameState, selected, legalMoves, isAiThinking, isAiMode, pendingPromotion, PLAYER, sendMove]);

  /* ── Pawn promotion ── */
  const handlePromotion = useCallback((pieceType: "Q" | "R" | "B" | "N") => {
    if (!pendingPromotion) return;
    const move: Move = { ...pendingPromotion, promotion: pieceType as PieceType };
    if (isAiMode) {
      const next = applyMove(gameState, move);
      setLastMove(move); setAiGameState(next);
    } else {
      sendMove(move);
      setLastMove(move);
    }
    setPendingPromotion(null);
  }, [pendingPromotion, gameState, isAiMode, sendMove]);

  /* ── New game / resign ── */
  const startNewGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAiGameState(createInitialState());
    setSelected(null); setLegalMoves([]);
    setLastMove(null); setPendingPromotion(null);
    setIsAiThinking(false); setShowResign(false);
    thinkingRef.current = false;
  }, []);

  const handleResign = useCallback(() => {
    if (isAiMode) {
      setAiGameState(prev => ({ ...prev, status: "ended", winner: AI_COLOR, endReason: "resign" }));
    } else {
      sendResign();
    }
    setShowResign(false);
  }, [isAiMode, AI_COLOR, sendResign]);

  /* ── Return to main menu ── */
  const goToMenu = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    thinkingRef.current = false;
    leaveRoom();
    setAiGameState(createInitialState());
    setAppMode("select");
    setSelected(null); setLegalMoves([]); setLastMove(null);
    setPendingPromotion(null); setIsAiThinking(false);
    setShowResign(false); setShowSettings(false);
  }, [leaveRoom]);

  /* ── Start AI game ── */
  const goAiMode = useCallback(() => {
    startNewGame();
    setShowTutorial(true);
    setAppMode("ai");
  }, [startNewGame]);

  /* ── Create PvP room ── */
  const handleCreateRoom = useCallback(async () => {
    setSelected(null); setLegalMoves([]); setLastMove(null);
    await createRoom(user.username ?? "White");
    setAppMode("pvp");
  }, [createRoom, user.username]);

  /* ── Join PvP room ── */
  const handleJoinRoom = useCallback(async (code: string) => {
    setSelected(null); setLegalMoves([]); setLastMove(null);
    await joinRoom(code, user.username ?? "Black");
    setAppMode("pvp");
  }, [joinRoom, user.username]);

  /* ── Leave PvP game ── */
  const handleLeaveGame = useCallback(() => {
    leaveRoom();
    setAppMode("select");
    setSelected(null); setLegalMoves([]); setLastMove(null);
  }, [leaveRoom]);

  /* ── Send invite to friend from lobby ── */
  const handleSendInvite = useCallback(async (friend: Friend) => {
    if (!pvp.roomCode) return;
    await user.sendInvite(friend.id, pvp.roomCode);
  }, [pvp.roomCode, user]);

  /* ── Challenge friend directly: create room then invite ── */
  const pendingInviteFriendRef = useRef<Friend | null>(null);

  const handleChallengeFriend = useCallback(async (friend: Friend) => {
    pendingInviteFriendRef.current = friend;
    setSelected(null); setLegalMoves([]); setLastMove(null);
    await createRoom(user.username ?? "White");
    setAppMode("pvp");
  }, [createRoom, user.username]);

  // Fire the invite once the room code is available
  useEffect(() => {
    if (pvp.status === "waiting" && pvp.roomCode && pendingInviteFriendRef.current) {
      const f = pendingInviteFriendRef.current;
      pendingInviteFriendRef.current = null;
      user.sendInvite(f.id, pvp.roomCode);
    }
  }, [pvp.status, pvp.roomCode, user]);

  /* ── Accept incoming invite ── */
  const handleAcceptInvite = useCallback(async (code: string) => {
    await user.clearInvite();
    await handleJoinRoom(code);
  }, [user, handleJoinRoom]);

  /* ── Save preferences ── */
  const handleSavePrefs = useCallback(() => {
    user.savePrefs({ boardTheme, customBoard, bgTheme, customBgColor, customBgImage, customTextColor, appTheme });
  }, [user, boardTheme, customBoard, bgTheme, customBgColor, customBgImage, customTextColor, appTheme]);

  /* ── Keyboard escape ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelected(null); setLegalMoves([]); setShowResign(false); setShowSettings(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── Outside-tap to close in-game settings ── */
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        gameSettingsRef.current && !gameSettingsRef.current.contains(target) &&
        gameSettingsBtnRef.current && !gameSettingsBtnRef.current.contains(target)
      ) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showSettings]);

  /* ── Settings props bundle (passed to ModeSelect and SettingsPanel in game) ── */
  const settingsProps: ModeSelectSettingsProps = {
    boardTheme,       setBoardTheme,
    customBoard,      setCustomBoard,
    bgTheme,          setBgTheme,
    customBgColor,    setCustomBgColor,
    customBgImage,    setCustomBgImage,
    customTextColor,  setCustomTextColor,
    appTheme,         setAppTheme,
    onSavePrefs:      handleSavePrefs,
  };

  /* ── Derived display values ── */
  const levelColor = LEVEL_COLORS[aiLevel];
  const isPlaying  = gameState.status === "playing";
  const topColor   = PLAYER === "w" ? "b" : "w";
  const topActive  = gameState.turn === topColor && isPlaying;
  const botActive  = gameState.turn === PLAYER   && isPlaying;
  const aiActive   = isAiMode && topActive;

  const boardDisabled =
    gameState.turn !== PLAYER      ||
    (isAiThinking && isAiMode)     ||
    gameState.status !== "playing" ||
    (isPvpMode && pvp.status !== "playing");

  const myName = user.username ?? "You";

  const topNamePvp = PLAYER === "w"
    ? (pvp.guestName ?? "Black")
    : (pvp.hostName  ?? "White");

  const topName   = isAiMode ? "AI" : topNamePvp;
  const topAvatar = topColor === "b" ? "♚" : "♔";
  const botAvatar = PLAYER   === "w" ? "♔" : "♚";

  return (
    <main
      className={`relative w-full font-sans${appTheme === "light" ? " app-light-theme" : ""}`}
      style={{
        minHeight:     "100dvh",
        maxWidth:      "100vw",
        overflowX:     "hidden",
        overflowY:     "auto",
        display:       "flex",
        flexDirection: "column",
        transition:    "background 0.45s ease",
        background:    appTheme === "light" ? "rgba(230,238,248,0.96)" : undefined,
      }}
    >
      <ChessBackground bgTheme={bgTheme} customBgColor={customBgColor} customBgImage={customBgImage} />

      {/* ── Mode Select screen ── */}
      {appMode === "select" && (
        <ModeSelect
          username={myName}
          friends={user.friends}
          searchResults={user.searchResults}
          isSearching={user.isSearching}
          pendingInvite={user.pendingInvite}
          pvp={pvp}
          settings={settingsProps}
          onSelectAI={goAiMode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSearchUsers={user.searchUsers}
          onAddFriend={user.addFriend}
          onRemoveFriend={user.removeFriend}
          onSendInvite={handleSendInvite}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={user.clearInvite}
          onChallengeFriend={handleChallengeFriend}
        />
      )}

      {/* ── PvP Lobby (waiting for opponent) ── */}
      {isPvpMode && pvp.status === "waiting" && pvp.roomCode && (
        <PvpLobby
          roomCode={pvp.roomCode}
          username={myName}
          onCancel={handleLeaveGame}
        />
      )}

      {/* ── Game view — hidden while waiting for PvP opponent ── */}
      {appMode !== "select" && !(isPvpMode && pvp.status === "waiting") && (
        <div
          className="relative flex flex-col"
          style={{ zIndex: 1, flex: 1, maxWidth: 480, margin: "0 auto", width: "100%" }}
        >
          {/* ── Header ── */}
          <header
            className="flex items-center justify-between px-4 shrink-0"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top))", paddingBottom: 8 }}
          >
            <div className="flex items-center gap-2.5">
              {/* Main Menu button */}
              <button
                onClick={goToMenu}
                className="rounded-xl transition-all active:scale-95"
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           5,
                  padding:       "5px 11px",
                  height:        36,
                  fontSize:      11,
                  fontWeight:    700,
                  background:    "rgba(255,255,255,0.05)",
                  border:        "1px solid rgba(255,255,255,0.09)",
                  color:         "#4a6272",
                  letterSpacing: "0.02em",
                  whiteSpace:    "nowrap",
                }}
                aria-label="Return to main menu"
              >
                <span style={{ fontSize: 14 }}>&#8592;</span> Menu
              </button>

              <div>
                <h1 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em", color: "#e8dfc0", lineHeight: 1.1 }}>
                  Chess
                </h1>
                <p style={{ fontSize: 10, color: "#4a6272", fontWeight: 700, letterSpacing: "0.04em" }}>
                  {isAiMode ? "vs AI" : `Room: ${pvp.roomCode ?? ""}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isAiMode && (
                <button
                  onClick={() => setShowTutorial(true)}
                  className="rounded-xl transition-all active:scale-95"
                  style={{
                    padding:       "5px 11px",
                    fontSize:      11,
                    fontWeight:    700,
                    background:    "rgba(212,175,55,0.08)",
                    border:        "1px solid rgba(212,175,55,0.22)",
                    color:         "#d4af37",
                    letterSpacing: "0.02em",
                  }}
                  aria-label="How to play"
                >
                  How to Play
                </button>
              )}
              {/* Tip button */}
              <button
                onClick={() => setShowTip(true)}
                className="rounded-xl transition-all active:scale-95"
                style={{
                  height:        32,
                  padding:       "0 10px",
                  display:       "flex",
                  alignItems:    "center",
                  gap:           4,
                  fontSize:      11,
                  fontWeight:    700,
                  background:    "rgba(212,175,55,0.07)",
                  border:        "1px solid rgba(212,175,55,0.22)",
                  color:         "#a08030",
                  letterSpacing: "0.02em",
                  whiteSpace:    "nowrap",
                }}
                aria-label="Tip the developer with Pi"
              >
                <span style={{ fontSize: 13 }}>π</span> Tip
              </button>

              <button
                ref={gameSettingsBtnRef}
                onClick={() => setShowSettings(s => !s)}
                className="rounded-xl transition-all active:scale-95"
                style={{
                  width:          32,
                  height:         32,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       16,
                  background:     showSettings ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.05)",
                  border:         showSettings ? "1px solid rgba(212,175,55,0.38)" : "1px solid rgba(255,255,255,0.09)",
                  color:          showSettings ? "#d4af37" : "#4a6272",
                }}
                aria-label="Settings"
              >
                &#9881;
              </button>
            </div>
          </header>

          {/* Settings tray */}
          {showSettings && (
            <div ref={gameSettingsRef} className="mx-4 mb-2 shrink-0">
              <SettingsPanel
                boardTheme={boardTheme}           setBoardTheme={setBoardTheme}
                customBoard={customBoard}         setCustomBoard={setCustomBoard}
                bgTheme={bgTheme}                 setBgTheme={setBgTheme}
                customBgColor={customBgColor}     setCustomBgColor={setCustomBgColor}
                customBgImage={customBgImage}     setCustomBgImage={setCustomBgImage}
                customTextColor={customTextColor} setCustomTextColor={setCustomTextColor}
                appTheme={appTheme}               setAppTheme={setAppTheme}
                onSave={handleSavePrefs}
              />
            </div>
          )}

          {/* Opponent panel */}
          <div className="px-4 pb-2 shrink-0">
            <PlayerPanel
              avatar={topAvatar}
              name={topName}
              badge={isAiMode ? aiLevel : undefined}
              badgeColor={isAiMode ? levelColor : undefined}
              captured={gameState.capturedPieces[topColor]}
              isActive={topActive}
              isThinking={aiActive && isAiThinking}
            />
          </div>

          {/* Board */}
          <div className="px-3 shrink-0" style={{ paddingTop: 2, paddingBottom: 2 }}>
            <ChessBoard
              state={gameState}
              selectedSquare={selected}
              legalMoves={legalMoves}
              lastMove={lastMove}
              playerColor={PLAYER}
              onSquareClick={handleSquareClick}
              disabled={boardDisabled}
              boardTheme={boardTheme}
              customColors={customBoard}
            />
          </div>

          {/* Player panel */}
          <div className="px-4 pt-2 shrink-0">
            <PlayerPanel
              avatar={botAvatar}
              name={myName}
              captured={gameState.capturedPieces[PLAYER]}
              isActive={botActive}
              showResign={isPlaying}
              onResign={() => setShowResign(true)}
            />
          </div>

          {/* Status bar */}
          <div className="px-4 pt-2 pb-1 shrink-0">
            <StatusBar
              state={gameState}
              isAiThinking={isAiThinking && isAiMode}
              playerColor={PLAYER}
              mode={isAiMode ? "ai" : "pvp"}
            />
          </div>

          {/* Move history */}
          <div
            className="px-4 py-2 shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.22)" }}
          >
            <MoveHistory moves={gameState.moveHistory} />
          </div>

          {/* AI difficulty selector */}
          {isAiMode && (
            <div
              className="px-4 py-3 shrink-0"
              style={{
                borderTop:     "1px solid rgba(255,255,255,0.04)",
                background:    "rgba(0,0,0,0.32)",
                paddingBottom: "max(14px, env(safe-area-inset-bottom))",
              }}
            >
              <p style={{
                color:         "#4a6272",
                fontSize:      9,
                textAlign:     "center",
                marginBottom:  7,
                fontWeight:    800,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}>
                AI Difficulty
              </p>
              <DifficultySelector current={aiLevel} onChange={setAiLevel} />
            </div>
          )}

          {/* PvP bottom bar */}
          {isPvpMode && (
            <div
              className="px-4 py-3 shrink-0 flex items-center justify-between gap-2"
              style={{
                borderTop:     "1px solid rgba(255,255,255,0.04)",
                background:    "rgba(0,0,0,0.32)",
                paddingBottom: "max(14px, env(safe-area-inset-bottom))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width:        8,
                  height:       8,
                  borderRadius: "50%",
                  background:   pvp.status === "playing" ? "#4ade80" : "#d4af37",
                  boxShadow:    pvp.status === "playing" ? "0 0 8px #4ade80" : "0 0 8px #d4af37",
                  animation:    pvp.status !== "playing" ? "bounce-dot 1s ease-in-out infinite" : undefined,
                }} />
                <span style={{ color: "#4a6272", fontSize: 11, fontWeight: 600 }}>
                  {pvp.status === "playing"
                    ? `${myName} vs ${topName}`
                    : "Connecting..."}
                </span>
              </div>
              <button
                onClick={goToMenu}
                className="rounded-xl transition-all active:scale-95"
                style={{
                  padding:    "4px 12px",
                  fontSize:   10,
                  fontWeight: 700,
                  background: "rgba(239,68,68,0.08)",
                  border:     "1px solid rgba(239,68,68,0.22)",
                  color:      "#f87171",
                }}
                aria-label="Leave game and return to menu"
              >
                Leave
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Overlays ── */}
      {isAiMode && showTutorial && (
        <TutorialPrompt onDismiss={() => setShowTutorial(false)} />
      )}

      {pendingPromotion && (
        <PromotionModal color={PLAYER} onSelect={handlePromotion} />
      )}

      {showResign && (
        <ResignConfirm
          onConfirm={handleResign}
          onCancel={() => setShowResign(false)}
          mode={isAiMode ? "ai" : "pvp"}
        />
      )}

      {appMode !== "select" && (
        <GameEndModal
          state={gameState}
          playerColor={PLAYER}
          onNewGame={isAiMode ? startNewGame : goToMenu}
          onRematch={isAiMode ? startNewGame : goToMenu}
          mode={isAiMode ? "ai" : "pvp"}
          onMainMenu={goToMenu}
        />
      )}


    </main>
  );
}
