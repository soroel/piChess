"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BoardTheme } from "@/components/chess-board";
import type { BgTheme }    from "@/components/chess-background";
import type { AppTheme }   from "@/components/settings-panel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Friend {
  id:       string;
  username: string;
  online?:  boolean;
}

export interface SavedPreferences {
  boardTheme:      BoardTheme;
  customBoard:     { light: string; dark: string } | null;
  bgTheme:         BgTheme;
  customBgColor:   string | null;
  customBgImage:   string | null;  // base64 data-URL
  customTextColor: string | null;  // hex override for menu text
  appTheme:        AppTheme;
}

export interface PendingInvite {
  fromId:   string;
  fromName: string;
  roomCode: string;
  ts:       number;
}

// ─── Stable player ID ──────────────────────────────────────────────────────

function getPlayerId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("chess_player_id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("chess_player_id", id);
  }
  return id;
}

const LS_USERNAME    = "chess_username";
const LS_FRIENDS     = "chess_friends";
const LS_PREFS       = "chess_preferences";

const DEFAULT_PREFS: SavedPreferences = {
  boardTheme:      "classic",
  customBoard:     null,
  bgTheme:         "navy",
  customBgColor:   null,
  customBgImage:   null,
  customTextColor: null,
  appTheme:        "dark",
};

function loadPrefs(): SavedPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(LS_PREFS);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

function loadFriends(): Friend[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_FRIENDS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useUser() {
  const playerId     = useRef(getPlayerId());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const invitePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [username,      setUsername]      = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_USERNAME) : null
  );
  const [friends,       setFriendsState]  = useState<Friend[]>(loadFriends);
  const [prefs,         setPrefsState]    = useState<SavedPreferences>(loadPrefs);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // ── Persist friends ────────────────────────────────────────────────────
  const saveFriends = useCallback((list: Friend[]) => {
    localStorage.setItem(LS_FRIENDS, JSON.stringify(list));
    setFriendsState(list);
  }, []);

  // ── Register / update username ─────────────────────────────────────────
  const registerUsername = useCallback(async (name: string): Promise<boolean> => {
    setRegisterError(null);
    try {
      const res = await fetch("/api/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "register", playerId: playerId.current, username: name }),
      });
      const data = await res.json() as { ok?: boolean; username?: string; error?: string };
      if (!res.ok) {
        setRegisterError(data.error ?? "Registration failed");
        return false;
      }
      const finalName = data.username ?? name;
      localStorage.setItem(LS_USERNAME, finalName);
      setUsername(finalName);
      return true;
    } catch {
      setRegisterError("Network error — try again");
      return false;
    }
  }, []);

  // ── Search users ───────────────────────────────────────────────────────
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res  = await fetch(`/api/users?action=search&playerId=${playerId.current}&query=${encodeURIComponent(query)}`);
      const data = await res.json() as { results: Friend[] };
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally { setIsSearching(false); }
  }, []);

  // ── Add / remove friend ────────────────────────────────────────────────
  const addFriend = useCallback((f: Friend) => {
    setFriendsState(prev => {
      if (prev.some(p => p.id === f.id)) return prev;
      const next = [...prev, { id: f.id, username: f.username }];
      localStorage.setItem(LS_FRIENDS, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFriend = useCallback((id: string) => {
    setFriendsState(prev => {
      const next = prev.filter(f => f.id !== id);
      localStorage.setItem(LS_FRIENDS, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Send game invite ───────────────────────────────────────────────────
  const sendInvite = useCallback(async (targetId: string, roomCode: string) => {
    await fetch("/api/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "invite", playerId: playerId.current, targetId, roomCode }),
    });
  }, []);

  // ── Accept / dismiss invite ─────────────────────────────────────────────
  const clearInvite = useCallback(async () => {
    setPendingInvite(null);
    await fetch("/api/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "clearInvite", playerId: playerId.current }),
    });
  }, []);

  // ── Save / load preferences ────────────────────────────────────────────
  const savePrefs = useCallback((p: SavedPreferences) => {
    localStorage.setItem(LS_PREFS, JSON.stringify(p));
    setPrefsState(p);
  }, []);

  // ── Refresh friend presence ────────────────────────────────────────────
  const refreshPresence = useCallback(async () => {
    const ids = friends.map(f => f.id).join(",");
    if (!ids) return;
    try {
      const res  = await fetch(`/api/users?action=presence&playerId=${playerId.current}&ids=${ids}`);
      const data = await res.json() as { presence: Record<string, { username: string; online: boolean }> };
      setFriendsState(prev => prev.map(f => ({
        ...f,
        online: data.presence[f.id]?.online ?? false,
      })));
    } catch {}
  }, [friends]);

  // ── Heartbeat — keep this user "online" ────────────────────────────────
  useEffect(() => {
    if (!username) return;
    const beat = async () => {
      await fetch(`/api/users?action=heartbeat&playerId=${playerId.current}`);
    };
    beat();
    heartbeatRef.current = setInterval(beat, 20_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [username]);

  // ── Poll for incoming invites ──────────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    const poll = async () => {
      try {
        const res  = await fetch(`/api/users?action=poll&playerId=${playerId.current}`);
        const data = await res.json() as { invite: PendingInvite | null };
        if (data.invite && data.invite.ts > (pendingInvite?.ts ?? 0)) {
          setPendingInvite(data.invite);
        }
      } catch {}
    };
    poll();
    invitePollRef.current = setInterval(poll, 5_000);
    return () => { if (invitePollRef.current) clearInterval(invitePollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // ── Poll friend presence every 15 s ────────────────────────────────────
  useEffect(() => {
    if (!username || friends.length === 0) return;
    refreshPresence();
    const t = setInterval(refreshPresence, 15_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, friends.length]);

  return {
    playerId:    playerId.current,
    username,
    friends,
    prefs,
    pendingInvite,
    searchResults,
    isSearching,
    registerError,
    registerUsername,
    searchUsers,
    addFriend,
    removeFriend,
    sendInvite,
    clearInvite,
    savePrefs,
    saveFriends,
    refreshPresence,
  };
}
