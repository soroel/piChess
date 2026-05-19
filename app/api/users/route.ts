// In-memory user registry — stores presence, usernames, friend requests
import { NextRequest, NextResponse } from "next/server";

interface UserRecord {
  id:           string;
  username:     string;
  lastSeen:     number;   // epoch ms — used for online/offline status
  pendingInvite?: {
    fromId:   string;
    fromName: string;
    roomCode: string;
    ts:       number;
  } | null;
}

const users = new Map<string, UserRecord>();

const ONLINE_THRESHOLD_MS = 30_000; // 30 s — if lastSeen within this → online

function evictStale() {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000; // 12 h
  for (const [id, u] of users) {
    if (u.lastSeen < cutoff) users.delete(id);
  }
}

function isOnline(u: UserRecord) {
  return Date.now() - u.lastSeen < ONLINE_THRESHOLD_MS;
}

function publicUser(u: UserRecord) {
  return {
    id:       u.id,
    username: u.username,
    online:   isOnline(u),
    pendingInvite: u.pendingInvite ?? null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action   = searchParams.get("action");
  const playerId = searchParams.get("playerId");
  const query    = searchParams.get("query");
  const ids      = searchParams.get("ids"); // comma-separated list of friend IDs

  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  // Heartbeat — update lastSeen so others can see this user as online
  if (action === "heartbeat") {
    const u = users.get(playerId);
    if (u) { u.lastSeen = Date.now(); }
    return NextResponse.json({ ok: true });
  }

  // Check own pending invite
  if (action === "poll") {
    const u = users.get(playerId);
    if (!u) return NextResponse.json({ invite: null });
    u.lastSeen = Date.now();
    return NextResponse.json({ invite: u.pendingInvite ?? null });
  }

  // Search users by username prefix (case-insensitive)
  if (action === "search" && query) {
    evictStale();
    const q = query.toLowerCase().trim();
    const results = [...users.values()]
      .filter(u => u.id !== playerId && u.username.toLowerCase().includes(q))
      .slice(0, 10)
      .map(publicUser);
    return NextResponse.json({ results });
  }

  // Fetch presence for a list of friend IDs
  if (action === "presence" && ids) {
    const idList = ids.split(",").filter(Boolean);
    const result: Record<string, { username: string; online: boolean }> = {};
    for (const id of idList) {
      const u = users.get(id);
      if (u) result[id] = { username: u.username, online: isOnline(u) };
    }
    return NextResponse.json({ presence: result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  evictStale();
  const body = await req.json() as {
    action:    "register" | "invite" | "clearInvite";
    playerId:  string;
    username?: string;
    targetId?: string;
    roomCode?: string;
  };

  const { action, playerId } = body;

  if (action === "register") {
    if (!body.username?.trim()) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }
    const username = body.username.trim().slice(0, 20);
    // Check uniqueness (case-insensitive)
    const taken = [...users.values()].find(
      u => u.id !== playerId && u.username.toLowerCase() === username.toLowerCase()
    );
    if (taken) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    const existing = users.get(playerId);
    users.set(playerId, {
      id:       playerId,
      username,
      lastSeen: Date.now(),
      pendingInvite: existing?.pendingInvite ?? null,
    });
    return NextResponse.json({ ok: true, username });
  }

  if (action === "invite") {
    const { targetId, roomCode } = body;
    if (!targetId || !roomCode) {
      return NextResponse.json({ error: "Missing targetId or roomCode" }, { status: 400 });
    }
    const target = users.get(targetId);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const sender = users.get(playerId);
    target.pendingInvite = {
      fromId:   playerId,
      fromName: sender?.username ?? "Someone",
      roomCode,
      ts:       Date.now(),
    };
    return NextResponse.json({ ok: true });
  }

  if (action === "clearInvite") {
    const u = users.get(playerId);
    if (u) u.pendingInvite = null;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
