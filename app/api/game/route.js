/**
 * Single unified API route — all game operations in ONE serverless function.
 * State is persisted in Upstash Redis (if env vars set) or in-memory (local dev).
 */

import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/gameStore";
import {
  createRoom,
  createSoloRoom,
  joinRoom,
  forceStart,
  processMove,
  runBotTurns,
  sanitizeState,
} from "@/lib/gameEngine";

function genRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ─── GET /api/game?roomId=X&playerId=Y ────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const roomId   = searchParams.get("roomId");
  const playerId = searchParams.get("playerId");

  if (!roomId) return err("roomId required", 400);

  const room = await getRoom(roomId);
  if (!room)  return err("Room not found", 404);

  // Trigger delayed bot moves on each state poll (bots "think" then act)
  if (room.phase === "playing") {
    const before = JSON.stringify(room._botMoveAt);
    runBotTurns(room);
    const after = JSON.stringify(room._botMoveAt);
    // Save only if state changed (bot moved or new timer scheduled)
    if (before !== after || !room._botMoveAt) {
      await setRoom(roomId, room);
    }
  }

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
      const { playerName, avatarId } = body;
      if (!playerName?.trim()) return err("playerName required", 400);

      let roomId;
      do { roomId = genRoomId(); } while (await getRoom(roomId));

      const room = createRoom(roomId, playerName.trim(), body.maxPlayers ?? 4, avatarId ?? 15);
      await setRoom(roomId, room);
      return ok({ roomId, playerId: room.hostId });
    }

    // ── joinRoom ──────────────────────────────────────────────────────────────
    case "joinRoom": {
      const { roomId, playerName, avatarId } = body;
      if (!roomId?.trim() || !playerName?.trim()) return err("roomId and playerName required", 400);

      const code = roomId.trim().toUpperCase();
      const room = await getRoom(code);
      if (!room) return err("Room not found — check your code", 404);
      if (room.phase !== "waiting") return err("Game already in progress", 400);
      if (room.players.length >= (room.roomMaxPlayers ?? 4)) return err("Room is full", 400);

      const { room: updated, playerId } = joinRoom(room, playerName.trim(), avatarId ?? 15);
      await setRoom(code, updated);
      return ok({ playerId });
    }

    // ── startGame (host force-starts with 2–3 players) ───────────────────────
    case "startGame": {
      const { roomId, playerId } = body;
      if (!roomId || !playerId) return err("roomId and playerId required", 400);

      const room = await getRoom(roomId);
      if (!room) return err("Room not found", 404);

      const updated = forceStart(room, playerId);
      await setRoom(roomId, updated);
      return ok({ ok: true });
    }

    // ── playMove ──────────────────────────────────────────────────────────────
    case "playMove": {
      const { roomId, playerId, move } = body;
      if (!roomId || !playerId || !move) return err("roomId, playerId, move required", 400);

      const room = await getRoom(roomId);
      if (!room) return err("Room not found", 404);

      const updated = processMove(room, playerId, move);
      runBotTurns(updated);
      await setRoom(roomId, updated);
      return ok({ ok: true });
    }

    // ── createSoloRoom ────────────────────────────────────────────────────────
    case "createSoloRoom": {
      const { playerName, avatarId } = body;
      if (!playerName?.trim()) return err("playerName required", 400);

      let roomId;
      do { roomId = genRoomId(); } while (await getRoom(roomId));

      const { room, playerId } = createSoloRoom(roomId, playerName.trim(), avatarId ?? 15);
      // Run bot turns if first player is a bot (safety check)
      runBotTurns(room);
      await setRoom(roomId, room);
      return ok({ roomId, playerId });
    }

    // ── fillBotsAndStart (auto-fill after 60s wait) ───────────────────────
    case "fillBotsAndStart": {
      const { roomId, playerId } = body;
      if (!roomId || !playerId) return err("roomId and playerId required", 400);

      const room = await getRoom(roomId);
      if (!room) return err("Room not found", 404);
      if (room.phase !== "waiting") return err("Game already started", 400);
      if (room.hostId !== playerId) return err("Only host can fill bots", 403);

      // Import bot pool from game engine
      const { pickRandomBots, makeBot } = await import("@/lib/gameEngine");

      // Fill remaining seats with bots
      const cap = room.roomMaxPlayers ?? 4;
      const needed = cap - room.players.length;
      if (needed > 0) {
        const bots = pickRandomBots(needed);
        for (const botDef of bots) {
          room.players.push(makeBot(botDef));
        }
      }

      // Start the game
      const { forceStart: fs } = await import("@/lib/gameEngine");
      fs(room, playerId);
      runBotTurns(room);
      await setRoom(roomId, room);
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
