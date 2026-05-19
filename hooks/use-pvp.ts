"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameState, Move } from "@/lib/chess-engine";

export type PvpStatus =
  | "idle"
  | "creating"
  | "waiting"
  | "joining"
  | "playing"
  | "error";

export interface PvpState {
  status:      PvpStatus;
  roomCode:    string | null;
  playerColor: "w" | "b" | null;
  gameState:   GameState | null;
  errorMsg:    string | null;
  hostName:    string | null;
  guestName:   string | null;
}

// Must use same key and storage as use-user.ts so IDs are always identical
const PLAYER_ID_KEY = "chess_player_id";

function getPlayerId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function usePvp() {
  const [pvp, setPvp] = useState<PvpState>({
    status:      "idle",
    roomCode:    null,
    playerColor: null,
    gameState:   null,
    errorMsg:    null,
    hostName:    null,
    guestName:   null,
  });

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerId  = useRef(getPlayerId());
  // Keep a ref to latest pvp so poll closure is never stale
  const pvpRef    = useRef(pvp);
  pvpRef.current  = pvp;

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const poll = useCallback(async () => {
    const cur = pvpRef.current;
    if (!cur.roomCode || !cur.playerColor) return;
    if (cur.status !== "waiting" && cur.status !== "playing") return;

    try {
      const res = await fetch(
        `/api/room?code=${cur.roomCode}&playerId=${playerId.current}`
      );
      if (!res.ok) return;
      const data = await res.json() as {
        state:       GameState;
        color:       "w" | "b" | null;
        hasOpponent: boolean;
        hostName:    string | null;
        guestName:   string | null;
      };

      const resolvedColor = data.color ?? cur.playerColor;
      const newStatus: PvpStatus = data.hasOpponent ? "playing" : "waiting";

      setPvp(prev => {
        if (prev.status === "error") return prev;
        return {
          ...prev,
          status:      newStatus,
          playerColor: resolvedColor,
          gameState:   data.state ?? prev.gameState,
          hostName:    data.hostName ?? prev.hostName,
          guestName:   data.guestName ?? prev.guestName,
          errorMsg:    null,
        };
      });
    } catch {
      // network blip — ignore, will retry
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(poll, 800);
  }, [poll, stopPolling]);

  // Auto-start/stop polling based on status
  useEffect(() => {
    const s = pvp.status;
    if (s === "playing" || s === "waiting") {
      startPolling();
    } else {
      stopPolling();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pvp.status]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  /* ── createRoom ── */
  const createRoom = useCallback(async (username?: string) => {
    setPvp(prev => ({ ...prev, status: "creating", errorMsg: null }));
    try {
      const res = await fetch("/api/room", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:   "create",
          playerId: playerId.current,
          username: (username ?? "White").slice(0, 20),
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json() as { code: string; color: "w"; hostName: string };
      setPvp(prev => ({
        ...prev,
        status:      "waiting",
        roomCode:    data.code,
        playerColor: "w",
        hostName:    data.hostName,
        guestName:   null,
        gameState:   null,
        errorMsg:    null,
      }));
    } catch {
      setPvp(prev => ({ ...prev, status: "error", errorMsg: "Failed to create room. Try again." }));
    }
  }, []);

  /* ── joinRoom ── */
  const joinRoom = useCallback(async (code: string, username?: string) => {
    const upperCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (upperCode.length !== 6) {
      setPvp(prev => ({ ...prev, status: "idle", errorMsg: "Room code must be 6 characters." }));
      return;
    }
    setPvp(prev => ({ ...prev, status: "joining", errorMsg: null }));
    try {
      const res = await fetch("/api/room", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:   "join",
          code:     upperCode,
          playerId: playerId.current,
          username: (username ?? "Black").slice(0, 20),
        }),
      });
      if (res.status === 404) {
        setPvp(prev => ({ ...prev, status: "idle", errorMsg: "Room not found. Check the code and try again." }));
        return;
      }
      if (res.status === 409) {
        setPvp(prev => ({ ...prev, status: "idle", errorMsg: "Room is full." }));
        return;
      }
      if (!res.ok) throw new Error("Server error");
      const data = await res.json() as {
        code:        string;
        color:       "b";
        state:       GameState;
        hasOpponent: boolean;
        hostName:    string | null;
        guestName:   string | null;
      };
      setPvp(prev => ({
        ...prev,
        status:      "playing",
        roomCode:    data.code,
        playerColor: "b",
        gameState:   data.state,
        hostName:    data.hostName,
        guestName:   data.guestName ?? username ?? "Black",
        errorMsg:    null,
      }));
    } catch {
      setPvp(prev => ({ ...prev, status: "idle", errorMsg: "Failed to join. Check the code and try again." }));
    }
  }, []);

  /* ── sendMove ── */
  const sendMove = useCallback(async (move: Move) => {
    const { roomCode, playerColor, gameState } = pvpRef.current;
    if (!roomCode || !playerColor || !gameState) return;
    if (gameState.turn !== playerColor) return;
    try {
      const res = await fetch("/api/room", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "move", code: roomCode, playerId: playerId.current, move }),
      });
      if (res.ok) {
        const data = await res.json() as { state: GameState };
        setPvp(prev => ({ ...prev, gameState: data.state }));
      }
    } catch { /* reconcile on next poll */ }
  }, []);

  /* ── sendResign ── */
  const sendResign = useCallback(async () => {
    const { roomCode } = pvpRef.current;
    if (!roomCode) return;
    try {
      const res = await fetch("/api/room", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "resign", code: roomCode, playerId: playerId.current }),
      });
      if (res.ok) {
        const data = await res.json() as { state: GameState };
        setPvp(prev => ({ ...prev, gameState: data.state }));
      }
    } catch {}
  }, []);

  /* ── leaveRoom ── */
  const leaveRoom = useCallback(() => {
    stopPolling();
    setPvp({
      status:      "idle",
      roomCode:    null,
      playerColor: null,
      gameState:   null,
      errorMsg:    null,
      hostName:    null,
      guestName:   null,
    });
  }, [stopPolling]);

  return { pvp, createRoom, joinRoom, sendMove, sendResign, leaveRoom };
}
