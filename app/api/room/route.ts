import { NextRequest, NextResponse } from "next/server";
import { createInitialState, applyMove } from "@/lib/chess-engine";
import type { GameState, Move } from "@/lib/chess-engine";

interface Room {
  state:        GameState;
  hostId:       string;
  hostName:     string;
  guestId:      string | null;
  guestName:    string | null;
  lastActivity: number;
}

const rooms = new Map<string, Room>();

function evictStale() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.lastActivity < cutoff) rooms.delete(code);
  }
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code     = searchParams.get("code")?.toUpperCase();
  const playerId = searchParams.get("playerId");

  if (!code || !playerId) {
    return NextResponse.json({ error: "Missing code or playerId" }, { status: 400 });
  }

  const room = rooms.get(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  room.lastActivity = Date.now();

  // Determine player colour; allow a new second player to auto-join via poll
  let color: "w" | "b" | null = null;
  if (room.hostId === playerId) {
    color = "w";
  } else if (room.guestId === playerId) {
    color = "b";
  } else if (!room.guestId) {
    // First unknown player to poll gets assigned as guest
    room.guestId = playerId;
    color = "b";
  }

  const hasOpponent = !!(
    room.guestId &&
    room.hostId &&
    room.guestId !== room.hostId
  );

  return NextResponse.json({
    state:     room.state,
    color,
    hasOpponent,
    hostName:  room.hostName,
    guestName: room.guestName,
  });
}

export async function POST(req: NextRequest) {
  evictStale();
  const body = await req.json() as {
    action:    "create" | "join" | "move" | "resign";
    code?:     string;
    playerId:  string;
    username?: string;
    move?:     Move;
  };

  const { action, playerId } = body;
  const code = body.code?.toUpperCase();

  if (action === "create") {
    let newCode = generateCode();
    while (rooms.has(newCode)) newCode = generateCode();
    const hostName = (body.username ?? "White").slice(0, 20);
    rooms.set(newCode, {
      state:        createInitialState(),
      hostId:       playerId,
      hostName,
      guestId:      null,
      guestName:    null,
      lastActivity: Date.now(),
    });
    return NextResponse.json({ code: newCode, color: "w", hostName });
  }

  if (action === "join") {
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
    const room = rooms.get(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.guestId && room.guestId !== playerId) {
      return NextResponse.json({ error: "Room is full" }, { status: 409 });
    }
    const guestName = (body.username ?? "Black").slice(0, 20);
    room.guestId      = playerId;
    room.guestName    = guestName;
    room.lastActivity = Date.now();
    return NextResponse.json({
      code,
      color:       "b",
      state:       room.state,
      hasOpponent: true,   // joining always means both players present
      hostName:    room.hostName,
      guestName,
    });
  }

  if (action === "move") {
    if (!code || !body.move) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const room = rooms.get(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const isWhite = room.hostId  === playerId;
    const isBlack = room.guestId === playerId;
    const turn    = room.state.turn;

    if ((turn === "w" && !isWhite) || (turn === "b" && !isBlack)) {
      return NextResponse.json({ error: "Not your turn" }, { status: 403 });
    }
    if (room.state.status === "ended") {
      return NextResponse.json({ error: "Game already ended" }, { status: 409 });
    }

    try {
      room.state        = applyMove(room.state, body.move);
      room.lastActivity = Date.now();
    } catch {
      return NextResponse.json({ error: "Illegal move" }, { status: 422 });
    }

    return NextResponse.json({ state: room.state });
  }

  if (action === "resign") {
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
    const room = rooms.get(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const color  = room.hostId === playerId ? "w" : "b";
    const winner = color === "w" ? "b" : "w";
    room.state        = { ...room.state, status: "ended", winner, endReason: "resign" };
    room.lastActivity = Date.now();
    return NextResponse.json({ state: room.state });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
