"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { PvpState } from "@/hooks/use-pvp";
import type { Friend, PendingInvite } from "@/hooks/use-user";
import { SettingsPanel, type AppTheme } from "@/components/settings-panel";
import type { BoardTheme } from "@/components/chess-board";
import type { BgTheme } from "@/components/chess-background";
import { TipButton } from "@/components/tip-button";
// ─── Luminance helper ─────────────────────────────────────────────────────

function hexLuminance(hex: string): number {
  // Accepts #rrggbb or #rgb
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const BG_BASE_COLORS: Record<BgTheme, string> = {
  navy:     "#060810",
  crimson:  "#0d0608",
  forest:   "#060d08",
  amethyst: "#0a0610",
};

function getMenuTextColor(
  bgTheme: BgTheme,
  customBgColor: string | null,
  customTextColor: string | null,
  hasBgImage?: boolean,
): { primary: string; muted: string; accent: string } {
  // Manual text colour override wins always
  if (customTextColor) {
    return {
      primary: customTextColor,
      muted:   customTextColor + "aa",
      accent:  "#d4af37",
    };
  }
  // Background image always has a dark scrim → keep light text
  if (hasBgImage) {
    return { primary: "#e8dfc0", muted: "#7a9aaa", accent: "#d4af37" };
  }
  const baseHex = customBgColor ?? BG_BASE_COLORS[bgTheme];
  const lum = hexLuminance(baseHex);
  if (lum > 0.35) {
    return { primary: "#0d1220", muted: "#3a4a5a", accent: "#b8860b" };
  } else if (lum > 0.15) {
    return { primary: "#e8dfc0", muted: "#7a8a9a", accent: "#d4af37" };
  } else {
    return { primary: "#e8dfc0", muted: "#5a7888", accent: "#d4af37" };
  }
}

// ─── Shared style constants ────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background:   "linear-gradient(160deg, #0d1220 0%, #111828 100%)",
  borderRadius: 24,
  padding:      "18px 16px",
};

const GOLD_BORDER: React.CSSProperties = {
  border:    "2px solid rgba(212,175,55,0.30)",
  boxShadow: "0 0 60px rgba(212,175,55,0.06)",
};

const BLUE_BORDER: React.CSSProperties = {
  border:    "2px solid rgba(100,180,255,0.24)",
  boxShadow: "0 0 60px rgba(100,180,255,0.05)",
};

function OnlineDot({ online }: { online?: boolean }) {
  return (
    <span
      style={{
        display:      "inline-block",
        width:        8,
        height:       8,
        borderRadius: "50%",
        background:   online ? "#4ade80" : "#334455",
        boxShadow:    online ? "0 0 6px #4ade80" : "none",
        flexShrink:   0,
      }}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}

// ─── Invite Banner ────────────────────────────────────────────────────────

function InviteBanner({
  invite,
  onAccept,
  onDecline,
}: {
  invite:    PendingInvite;
  onAccept:  (code: string) => void;
  onDecline: () => void;
}) {
  return (
    <div
      className="animate-slide-up-fade"
      style={{
        position:       "fixed",
        top:            "max(16px, env(safe-area-inset-top))",
        left:           16,
        right:          16,
        zIndex:         100,
        background:     "linear-gradient(135deg, #0d1a28 0%, #112030 100%)",
        border:         "2px solid rgba(100,180,255,0.38)",
        borderRadius:   20,
        padding:        "14px 16px",
        boxShadow:      "0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(100,180,255,0.10)",
        backdropFilter: "blur(12px)",
      }}
      role="alert"
      aria-live="polite"
    >
      <p style={{ color: "#e8dfc0", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        Game invite from <span style={{ color: "#7ac0e8" }}>{invite.fromName}</span>
      </p>
      <p style={{ color: "#4a6272", fontSize: 11, marginBottom: 12 }}>
        Room:&nbsp;
        <span style={{ color: "#e8dfc0", fontFamily: "monospace", letterSpacing: "0.12em" }}>
          {invite.roomCode}
        </span>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onAccept(invite.roomCode)}
          className="flex-1 rounded-xl py-2 font-bold transition-all active:scale-95"
          style={{ background: "#7ac0e8", color: "#07091a", border: "none", fontSize: 12 }}
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="flex-1 rounded-xl py-2 font-bold transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.05)",
            color:      "#4a6272",
            border:     "1px solid rgba(255,255,255,0.09)",
            fontSize:   12,
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ─── Friends Panel ────────────────────────────────────────────────────────

function FriendsPanel({
  friends,
  searchResults,
  isSearching,
  pvp,
  onSearchUsers,
  onAddFriend,
  onRemoveFriend,
  onInvite,
  onChallenge,
}: {
  friends:       Friend[];
  searchResults: Friend[];
  isSearching:   boolean;
  pvp:           PvpState;
  onSearchUsers: (q: string) => void;
  onAddFriend:   (f: Friend) => void;
  onRemoveFriend:(id: string) => void;
  onInvite:      (f: Friend) => void;
  onChallenge:   (f: Friend) => void;
}) {
  const [query,      setQuery]      = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuery = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchUsers(q), 400);
  };

  const isFriend = useCallback((id: string) => friends.some(f => f.id === id), [friends]);
  const hasRoom  = pvp.status === "waiting" && !!pvp.roomCode;

  return (
    <div style={{ ...CARD, ...BLUE_BORDER }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>&#9820;</span>
          <h2 style={{ color: "#e8dfc0", fontSize: 15, fontWeight: 800 }}>Friends</h2>
          <span style={{ color: "#4a6272", fontSize: 11, fontWeight: 600 }}>
            ({friends.filter(f => f.online).length}/{friends.length} online)
          </span>
        </div>
        <button
          onClick={() => setShowSearch(s => !s)}
          style={{
            padding:      "4px 10px",
            borderRadius: 10,
            fontSize:     10,
            fontWeight:   700,
            background:   showSearch ? "rgba(100,180,255,0.14)" : "rgba(255,255,255,0.04)",
            border:       showSearch ? "1px solid rgba(100,180,255,0.36)" : "1px solid rgba(255,255,255,0.09)",
            color:        showSearch ? "#7ac0e8" : "#4a6272",
            cursor:       "pointer",
            transition:   "all 0.2s ease",
          }}
          aria-label="Search for users"
        >
          {showSearch ? "Close" : "+ Find"}
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div style={{ marginBottom: 12 }}>
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="Search by username..."
            className="w-full rounded-xl px-3 py-2.5 outline-none"
            style={{
              background:   "rgba(255,255,255,0.04)",
              border:       "1.5px solid rgba(100,180,255,0.22)",
              color:        "#e8dfc0",
              fontSize:     13,
              marginBottom: 8,
            }}
            aria-label="Search users"
            autoFocus
          />
          {isSearching && (
            <p style={{ color: "#4a6272", fontSize: 11, textAlign: "center" }}>Searching...</p>
          )}
          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {searchResults.map(u => (
                <div
                  key={u.id}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "space-between",
                    padding:        "7px 10px",
                    borderRadius:   12,
                    background:     "rgba(255,255,255,0.03)",
                    border:         "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <OnlineDot online={u.online} />
                    <span style={{ color: "#c8d8e0", fontSize: 13, fontWeight: 600 }}>{u.username}</span>
                  </div>
                  {!isFriend(u.id) ? (
                    <button
                      onClick={() => onAddFriend(u)}
                      style={{
                        padding:      "3px 10px",
                        borderRadius: 8,
                        fontSize:     10,
                        fontWeight:   700,
                        background:   "rgba(100,180,255,0.10)",
                        border:       "1px solid rgba(100,180,255,0.32)",
                        color:        "#7ac0e8",
                        cursor:       "pointer",
                      }}
                    >
                      + Add
                    </button>
                  ) : (
                    <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 700 }}>Friend</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {query && !isSearching && searchResults.length === 0 && (
            <p style={{ color: "#4a6272", fontSize: 11, textAlign: "center" }}>No users found</p>
          )}
        </div>
      )}

      {/* Friends list */}
      {friends.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ color: "#344858", fontSize: 12, lineHeight: 1.6 }}>
            No friends yet. Use the Find button above to search and add players.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[...friends]
            .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0))
            .map(f => (
              <div
                key={f.id}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  padding:        "8px 10px",
                  borderRadius:   14,
                  background:     f.online ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)",
                  border:         f.online ? "1px solid rgba(74,222,128,0.14)" : "1px solid rgba(255,255,255,0.05)",
                  transition:     "background 0.3s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{
                    width:          30,
                    height:         30,
                    borderRadius:   "50%",
                    background:     "rgba(255,255,255,0.06)",
                    border:         `1.5px solid ${f.online ? "rgba(74,222,128,0.36)" : "rgba(255,255,255,0.08)"}`,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize:       14,
                    color:          "#e8dfc0",
                    fontWeight:     700,
                  }}>
                    {f.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: "#e8dfc0", fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                      {f.username}
                    </p>
                    <p style={{ color: f.online ? "#4ade80" : "#334455", fontSize: 10, fontWeight: 600 }}>
                      {f.online ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {f.online && (
                    hasRoom ? (
                      <button
                        onClick={() => onInvite(f)}
                        style={{
                          padding:      "3px 10px",
                          borderRadius: 8,
                          fontSize:     10,
                          fontWeight:   700,
                          background:   "rgba(100,180,255,0.10)",
                          border:       "1px solid rgba(100,180,255,0.30)",
                          color:        "#7ac0e8",
                          cursor:       "pointer",
                        }}
                        aria-label={`Send invite to ${f.username}`}
                      >
                        Invite
                      </button>
                    ) : (
                      <button
                        onClick={() => onChallenge(f)}
                        style={{
                          padding:      "3px 10px",
                          borderRadius: 8,
                          fontSize:     10,
                          fontWeight:   700,
                          background:   "rgba(74,222,128,0.09)",
                          border:       "1px solid rgba(74,222,128,0.26)",
                          color:        "#4ade80",
                          cursor:       "pointer",
                        }}
                        aria-label={`Challenge ${f.username}`}
                      >
                        Challenge
                      </button>
                    )
                  )}
                  <button
                    onClick={() => onRemoveFriend(f.id)}
                    style={{
                      width:          22,
                      height:         22,
                      borderRadius:   6,
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      background:     "rgba(239,68,68,0.07)",
                      border:         "1px solid rgba(239,68,68,0.18)",
                      color:          "#f87171",
                      fontSize:       12,
                      cursor:         "pointer",
                      flexShrink:     0,
                    }}
                    aria-label={`Remove ${f.username}`}
                  >
                    &#x2715;
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Mode Select ─────────────────────────────────────────────────────

export interface ModeSelectSettingsProps {
  boardTheme:         BoardTheme;
  setBoardTheme:      (t: BoardTheme) => void;
  customBoard:        { light: string; dark: string } | null;
  setCustomBoard:     (c: { light: string; dark: string } | null) => void;
  bgTheme:            BgTheme;
  setBgTheme:         (t: BgTheme) => void;
  customBgColor:      string | null;
  setCustomBgColor:   (c: string | null) => void;
  customBgImage:      string | null;
  setCustomBgImage:   (img: string | null) => void;
  customTextColor:    string | null;
  setCustomTextColor: (c: string | null) => void;
  appTheme:           AppTheme;
  setAppTheme:        (t: AppTheme) => void;
  onSavePrefs:        () => void;
}

export function ModeSelect({
  username,
  friends,
  searchResults,
  isSearching,
  pendingInvite,
  pvp,
  settings,
  onSelectAI,
  onCreateRoom,
  onJoinRoom,
  onSearchUsers,
  onAddFriend,
  onRemoveFriend,
  onSendInvite,
  onAcceptInvite,
  onDeclineInvite,
  onChallengeFriend,
}: {
  username:          string;
  friends:           Friend[];
  searchResults:     Friend[];
  isSearching:       boolean;
  pendingInvite:     PendingInvite | null;
  pvp:               PvpState;
  settings:          ModeSelectSettingsProps;
  onSelectAI:        () => void;
  onCreateRoom:      () => void;
  onJoinRoom:        (code: string) => void;
  onSearchUsers:     (q: string) => void;
  onAddFriend:       (f: Friend) => void;
  onRemoveFriend:    (id: string) => void;
  onSendInvite:      (f: Friend) => void;
  onAcceptInvite:    (code: string) => void;
  onDeclineInvite:   () => void;
  onChallengeFriend: (f: Friend) => void;
}) {
  const [tab,          setTab]          = useState<"ai" | "pvp">("ai");
  const [joinCode,     setJoinCode]     = useState("");
  const [showFriends,  setShowFriends]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef        = useRef<HTMLInputElement>(null);
  const settingsRef     = useRef<HTMLDivElement>(null);
  const settingsBtnRef  = useRef<HTMLButtonElement>(null);
  const friendsRef      = useRef<HTMLDivElement>(null);
  const friendsBtnRef   = useRef<HTMLButtonElement>(null);

  const busy = pvp.status === "creating" || pvp.status === "joining";

  const textColors = getMenuTextColor(settings.bgTheme, settings.customBgColor, settings.customTextColor, !!settings.customBgImage);

  // Close panels on outside tap
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (showSettings &&
          settingsRef.current && !settingsRef.current.contains(target) &&
          settingsBtnRef.current && !settingsBtnRef.current.contains(target)) {
        setShowSettings(false);
      }
      if (showFriends &&
          friendsRef.current && !friendsRef.current.contains(target) &&
          friendsBtnRef.current && !friendsBtnRef.current.contains(target)) {
        setShowFriends(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showSettings, showFriends]);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 80, background: "transparent", overflowY: "auto" }}
    >
      {/* Invite banner */}
      {pendingInvite && (
        <InviteBanner
          invite={pendingInvite}
          onAccept={code => onAcceptInvite(code)}
          onDecline={onDeclineInvite}
        />
      )}

      <div className="flex flex-col items-center px-5 py-8" style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>

        {/* ── Header ── */}
        <div style={{ width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          {/* Chess icon + title */}
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <div style={{ fontSize: 72, lineHeight: 1, filter: "drop-shadow(0 0 48px rgba(212,175,55,0.55))", marginBottom: 8 }}>
              &#9819;
            </div>
            <h1 style={{ fontSize: "clamp(26px,7.5vw,38px)", fontWeight: 900, letterSpacing: "-0.032em", color: textColors.primary, marginBottom: 4, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>
              Chess
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <OnlineDot online={true} />
              <span style={{ color: textColors.muted, fontSize: 12, fontWeight: 600, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                Playing as <span style={{ color: textColors.accent }}>{username}</span>
              </span>
            </div>
          </div>

          {/* Settings gear */}
          <button
            ref={settingsBtnRef}
            onClick={() => { setShowSettings(s => !s); setShowFriends(false); }}
            style={{
              width:          36,
              height:         36,
              borderRadius:   12,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       17,
              background:     showSettings ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.05)",
              border:         showSettings ? "1px solid rgba(212,175,55,0.38)" : "1px solid rgba(255,255,255,0.09)",
              color:          showSettings ? "#d4af37" : "#4a6272",
              cursor:         "pointer",
              transition:     "all 0.2s ease",
              flexShrink:     0,
            }}
            aria-label="Settings"
            aria-pressed={showSettings}
          >
            &#9881;
          </button>
        </div>

        {/* ── Settings panel (from menu) ── */}
        {showSettings && (
          <div ref={settingsRef} className="w-full mb-5 animate-slide-up-fade">
            <SettingsPanel
              boardTheme={settings.boardTheme}               setBoardTheme={settings.setBoardTheme}
              customBoard={settings.customBoard}             setCustomBoard={settings.setCustomBoard}
              bgTheme={settings.bgTheme}                     setBgTheme={settings.setBgTheme}
              customBgColor={settings.customBgColor}         setCustomBgColor={settings.setCustomBgColor}
              customBgImage={settings.customBgImage}         setCustomBgImage={settings.setCustomBgImage}
              customTextColor={settings.customTextColor}     setCustomTextColor={settings.setCustomTextColor}
              appTheme={settings.appTheme}                   setAppTheme={settings.setAppTheme}
              onSave={settings.onSavePrefs}
            />
          </div>
        )}

        {/* ── Tab switcher ── */}
        <div
          className="flex w-full mb-4"
          style={{
            background:   "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding:      4,
            border:       "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {([
            { key: "ai",  label: "vs AI",     icon: "&#9816;" },
            { key: "pvp", label: "vs Friend", icon: "&#9820;" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 rounded-xl py-2.5 font-bold transition-all"
              style={{
                background:    tab === t.key ? "rgba(212,175,55,0.14)" : "transparent",
                border:        tab === t.key ? "1.5px solid rgba(212,175,55,0.42)" : "1.5px solid transparent",
                color:         tab === t.key ? "#d4af37" : "#4a6272",
                boxShadow:     tab === t.key ? "0 0 18px rgba(212,175,55,0.09)" : "none",
                letterSpacing: "0.02em",
                fontSize:      14,
              }}
              aria-pressed={tab === t.key}
            >
              <span dangerouslySetInnerHTML={{ __html: t.icon }} style={{ marginRight: 5 }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Friends toggle & Tip (above game modes) ── */}
        <div className="w-full mb-4" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <TipButton />
          <button
            ref={friendsBtnRef}
            onClick={() => { setShowFriends(s => !s); setShowSettings(false); }}
            style={{
              padding:      "5px 13px",
              borderRadius: 10,
              fontSize:     11,
              fontWeight:   700,
              background:   showFriends ? "rgba(100,180,255,0.12)" : "rgba(255,255,255,0.05)",
              border:       showFriends ? "1px solid rgba(100,180,255,0.32)" : "1px solid rgba(255,255,255,0.09)",
              color:        showFriends ? "#7ac0e8" : "#4a6272",
              cursor:       "pointer",
              transition:   "all 0.2s ease",
            }}
            aria-pressed={showFriends}
            aria-label="Toggle friends panel"
          >
            Friends
            {friends.length > 0 && (
              <span style={{ marginLeft: 5, color: "#4ade80" }}>
                {friends.filter(f => f.online).length}/{friends.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Friends panel ── */}
        {showFriends && (
          <div ref={friendsRef} className="w-full mb-5 animate-slide-up-fade">
            <FriendsPanel
              friends={friends}
              searchResults={searchResults}
              isSearching={isSearching}
              pvp={pvp}
              onSearchUsers={onSearchUsers}
              onAddFriend={onAddFriend}
              onRemoveFriend={onRemoveFriend}
              onInvite={onSendInvite}
              onChallenge={onChallengeFriend}
            />
          </div>
        )}

        {/* ── Game mode panels ── */}
        <div className="w-full animate-slide-up-fade">
          {tab === "ai" ? (
            <div style={{ ...CARD, ...GOLD_BORDER }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width:          50,
                  height:         50,
                  borderRadius:   "50%",
                  background:     "rgba(212,175,55,0.08)",
                  border:         "1.5px solid rgba(212,175,55,0.30)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       26,
                  flexShrink:     0,
                }}>
                  &#9816;
                </div>
                <div>
                  <h2 style={{ color: "#e8dfc0", fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>Play vs AI</h2>
                  <p style={{ color: "#4a6272", fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>
                    Challenge the computer from Beginner to Expert. Pick your difficulty after starting.
                  </p>
                </div>
              </div>
              <button
                onClick={onSelectAI}
                className="w-full rounded-2xl py-3.5 font-bold transition-all active:scale-95"
                style={{
                  background:    "#d4af37",
                  color:         "#07091a",
                  border:        "1.5px solid #d4af37",
                  fontSize:      14,
                  letterSpacing: "0.03em",
                }}
              >
                Play vs AI
              </button>
            </div>
          ) : (
            <div style={{ ...CARD, ...BLUE_BORDER }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width:          50,
                  height:         50,
                  borderRadius:   "50%",
                  background:     "rgba(100,180,255,0.07)",
                  border:         "1.5px solid rgba(100,180,255,0.26)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       26,
                  flexShrink:     0,
                }}>
                  &#9820;
                </div>
                <div>
                  <h2 style={{ color: "#e8dfc0", fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>Play vs Friend</h2>
                  <p style={{ color: "#4a6272", fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>
                    Create a room and share the 6-letter code, or enter a friend's code to join.
                  </p>
                </div>
              </div>

              {/* Create room */}
              <button
                onClick={onCreateRoom}
                disabled={busy}
                className="w-full rounded-2xl py-3 font-bold transition-all active:scale-95 mb-3"
                style={{
                  background:    busy ? "rgba(100,180,255,0.05)" : "rgba(100,180,255,0.12)",
                  border:        "1.5px solid rgba(100,180,255,0.36)",
                  color:         busy ? "#4a6272" : "#7ac0e8",
                  fontSize:      13,
                  letterSpacing: "0.02em",
                  cursor:        busy ? "not-allowed" : "pointer",
                }}
                aria-busy={busy}
              >
                {pvp.status === "creating" ? "Creating..." : "Create Room  (you play White)"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2 mb-3">
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                <span style={{ color: "#4a6272", fontSize: 11, fontWeight: 700 }}>OR JOIN</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>

              {/* Join room */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  onKeyDown={e => { if (e.key === "Enter" && joinCode.length === 6) onJoinRoom(joinCode); }}
                  placeholder="Room code..."
                  maxLength={6}
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="flex-1 rounded-2xl px-4 py-3 font-mono font-bold outline-none"
                  style={{
                    background:    "rgba(255,255,255,0.04)",
                    border:        pvp.errorMsg ? "1.5px solid rgba(239,68,68,0.40)" : "1.5px solid rgba(255,255,255,0.10)",
                    color:         "#e8dfc0",
                    letterSpacing: "0.12em",
                    fontSize:      16,
                    textTransform: "uppercase",
                    transition:    "border 0.2s ease",
                  }}
                  aria-label="Room code"
                />
                <button
                  onClick={() => { if (joinCode.length === 6 && !busy) onJoinRoom(joinCode); }}
                  disabled={joinCode.length !== 6 || busy}
                  className="rounded-2xl px-5 py-3 font-bold transition-all active:scale-95"
                  style={{
                    background:    joinCode.length === 6 && !busy ? "#7ac0e8" : "rgba(255,255,255,0.04)",
                    color:         joinCode.length === 6 && !busy ? "#07091a" : "#4a6272",
                    border:        "1.5px solid rgba(100,180,255,0.36)",
                    fontSize:      13,
                    letterSpacing: "0.02em",
                    cursor:        joinCode.length !== 6 || busy ? "not-allowed" : "pointer",
                    transition:    "all 0.18s ease",
                    whiteSpace:    "nowrap",
                  }}
                >
                  {pvp.status === "joining" ? "..." : "Join"}
                </button>
              </div>

              {pvp.errorMsg && (
                <p style={{ color: "#f87171", fontSize: 12, textAlign: "center", fontWeight: 600, marginTop: 8 }}>
                  {pvp.errorMsg}
                </p>
              )}

              <p style={{ color: "#334455", fontSize: 10, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                Or challenge a friend directly from the Friends panel above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PvP Lobby ────────────────────────────────────────────────────────────

export function PvpLobby({
  roomCode,
  username,
  onCancel,
}: {
  roomCode: string;
  username: string;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 75, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="animate-modal-in w-full rounded-3xl p-6 flex flex-col items-center gap-5 text-center"
        style={{
          maxWidth:   360,
          background: "linear-gradient(160deg, #0d1220 0%, #111828 100%)",
          border:     "2px solid rgba(100,180,255,0.28)",
          boxShadow:  "0 0 80px rgba(100,180,255,0.08)",
        }}
      >
        <div style={{ fontSize: 52 }} aria-hidden="true">&#9822;</div>
        <div>
          <h2 style={{ color: "#e8dfc0", fontSize: 19, fontWeight: 800, marginBottom: 6 }}>
            Waiting for Opponent
          </h2>
          <p style={{ color: "#5a7888", fontSize: 12, marginBottom: 4 }}>
            Playing as <span style={{ color: "#d4af37" }}>{username}</span> (White)
          </p>
          <p style={{ color: "#4a6272", fontSize: 12, lineHeight: 1.6 }}>
            Share this code with your friend. They enter it on the vs Friend tab to join as Black.
          </p>
        </div>

        {/* Room code — tap to copy */}
        <button
          onClick={copy}
          className="rounded-2xl px-8 py-4 transition-all active:scale-95 w-full"
          style={{
            background: "rgba(100,180,255,0.08)",
            border:     "2px solid rgba(100,180,255,0.36)",
            boxShadow:  "0 0 32px rgba(100,180,255,0.08)",
          }}
          aria-label={`Room code ${roomCode} — tap to copy`}
        >
          <div style={{
            fontFamily:    "monospace",
            fontSize:      "clamp(28px,9vw,36px)",
            fontWeight:    900,
            color:         "#7ac0e8",
            letterSpacing: "0.22em",
          }}>
            {roomCode}
          </div>
          <div style={{ color: copied ? "#4ade80" : "#4a6272", fontSize: 11, fontWeight: 700, marginTop: 4 }}>
            {copied ? "Copied!" : "Tap to copy"}
          </div>
        </button>

        {/* Animated waiting dots */}
        <div className="flex gap-1.5 items-center" aria-label="Waiting for opponent">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width:        8,
                height:       8,
                borderRadius: "50%",
                background:   "#7ac0e8",
                animation:    `bounce-dot 0.72s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="rounded-2xl py-2.5 px-8 font-semibold transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.04)",
            border:     "1px solid rgba(255,255,255,0.09)",
            color:      "#4a6272",
            fontSize:   13,
          }}
        >
          Cancel &amp; Return to Menu
        </button>
      </div>
    </div>
  );
}
