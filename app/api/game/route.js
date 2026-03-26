/**
 * Single unified API route — all game operations in ONE serverless function.
 *
 * Why: Vercel spins up separate Lambda containers for each route file.
 * Putting everything here means polling (1 req/s) keeps THIS function warm
 * and all calls share the same in-memory store.
 */

import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/gameStore";
import {
  createRoom,
  joinRoom,
  processMove,
  sanitizeState,
} from "@/lib/gameEngine";

function genRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ─── GET /api/game?action=state&roomId=X&playerId=Y ───────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const roomId   = searchParams.get("roomId");
  const playerId = searchParams.get("playerId");

  if (!roomId) return err("roomId required", 400);

  const room = getRoom(roomId);
  if (!room)  return err("Room not found", 404);

  return ok(playerId ? sanitizeState(room, playerId) : room);
}

// ─── POST /api/game  { action, ...params } ────────────────────────────────────
export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return err("Invalid JSON", 400); }

  const { action } = body;

  switch (action) {
    // ── createRoom ────────────────────────────────────────────────────────────
    case "createRoom": {
      const { playerName } = body;
      if (!playerName?.trim()) return err("playerName required", 400);

      let roomId;
      do { roomId = genRoomId(); } while (getRoom(roomId));

      const room = createRoom(roomId, playerName.trim());
      setRoom(roomId, room);
      return ok({ roomId, playerId: room.hostId });
    }

    // ── joinRoom ──────────────────────────────────────────────────────────────
    case "joinRoom": {
      const { roomId, playerName } = body;
      if (!roomId?.trim() || !playerName?.trim()) return err("roomId and playerName required", 400);

      const code = roomId.trim().toUpperCase();
      const room = getRoom(code);
      if (!room) return err("Room not found — check your code", 404);
      if (room.phase !== "waiting") return err("Game already in progress", 400);
      if (room.players.length >= 4) return err("Room is full", 400);

      const { room: updated, playerId } = joinRoom(room, playerName.trim());
      setRoom(code, updated);
      return ok({ playerId });
    }

    // ── playMove ──────────────────────────────────────────────────────────────
    case "playMove": {
      const { roomId, playerId, move } = body;
      if (!roomId || !playerId || !move) return err("roomId, playerId, move required", 400);

      const room = getRoom(roomId);
      if (!room) return err("Room not found", 404);

      const updated = processMove(room, playerId, move);
      setRoom(roomId, updated);
      return ok({ ok: true });
    }

    default:
      return err(`Unknown action: ${action}`, 400);
  }
}

function ok(data) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
function err(msg, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
