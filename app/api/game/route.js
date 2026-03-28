/**
 * Single unified API route — all game operations in ONE serverless function.
 * State is persisted in Upstash Redis (if env vars set) or in-memory (local dev).
 */

import { NextResponse } from "next/server";
import { getRoom, setRoom, deleteRoom } from "@/lib/gameStore";
import {
  createRoom,
  createSoloRoom,
  joinRoom,
  forceStart,
  processMove,
  runBotTurns,
  sanitizeState,
} from "@/lib/gameEngine";
import {
  findOrCreateRoom,
  registerOpenRoom,
  removeFromQueue,
  recordRoomActivity,
  isRoomAbandoned,
  checkReconnectExpiry,
  handlePlayerLeave,
  reconnectPlayer,
  recordRageQuit,
  canAddBots,
  isBotWinner,
} from "@/lib/matchmaking";

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
  if (!room) return err("Room not found", 404);

  // Record activity (keeps room alive)
  recordRoomActivity(roomId).catch(() => {});

  // Check for abandoned rooms
  if (await isRoomAbandoned(roomId, room.phase)) {
    if (room.phase === "waiting") {
      removeFromQueue(roomId).catch(() => {});
      await deleteRoom(roomId);
      return err("Room expired — no players joined", 410);
    }
    // In-progress game abandoned — void it
    if (room.phase === "playing") {
      room.phase = "voided";
      await setRoom(roomId, room);
      return ok(playerId ? sanitizeState(room, playerId) : room);
    }
  }

  // Check reconnect window expiry — convert disconnected players to bots
  if (room.phase === "playing") {
    const conversions = checkReconnectExpiry(room);

    // Trigger delayed bot moves on each state poll
    runBotTurns(room);
    await setRoom(roomId, room);
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
    // ── createRoom (with matchmaking — joins existing open room if available) ─
    case "createRoom": {
      const { playerName, avatarId } = body;
      if (!playerName?.trim()) return err("playerName required", 400);
      const mode = body.mode || "free";

      // Try matchmaking — find an open room first
      const match = await findOrCreateRoom(mode);
      if (match?.action === "join" && match.roomId) {
        // Join existing open room
        const existingRoom = await getRoom(match.roomId);
        if (existingRoom && existingRoom.phase === "waiting" && existingRoom.players.length < (existingRoom.roomMaxPlayers ?? 4)) {
          const { room: updated, playerId } = joinRoom(existingRoom, playerName.trim(), avatarId ?? 15);
          // If room is now full, remove from queue
          if (updated.players.length >= (updated.roomMaxPlayers ?? 4)) {
            removeFromQueue(match.roomId).catch(() => {});
          }
          await setRoom(match.roomId, updated);
          return ok({ roomId: match.roomId, playerId });
        }
      }

      // No open room found — create new one
      let roomId;
      do { roomId = genRoomId(); } while (await getRoom(roomId));

      const room = createRoom(roomId, playerName.trim(), body.maxPlayers ?? 4, avatarId ?? 15);
      room._meta = { ...(room._meta || {}), mode };
      await setRoom(roomId, room);

      // Register in matchmaking queue
      registerOpenRoom(roomId, mode).catch(() => {});

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
      // Don't run bot turns here — let the GET poll handle it with proper delays
      // runBotTurns only runs on state polls, giving bots time to "think"
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
      // Bot turns will be triggered by the first GET poll with proper delays
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

      // Credits rooms = REAL PLAYERS ONLY — no bots allowed
      if (!canAddBots(room)) {
        return err("Credits rooms require real players. Keep waiting or invite friends.", 400);
      }

      // Free rooms — fill with bots
      const { pickRandomBots, makeBot } = await import("@/lib/gameEngine");
      const cap = room.roomMaxPlayers ?? 4;
      const needed = cap - room.players.length;
      if (needed > 0) {
        const bots = pickRandomBots(needed);
        for (const botDef of bots) {
          room.players.push(makeBot(botDef));
        }
      }

      removeFromQueue(roomId).catch(() => {});
      forceStart(room, playerId);
      // Bot turns handled by GET polls with delays — not here
      await setRoom(roomId, room);
      return ok({ ok: true });
    }

    // ── leaveGame (rage quit / voluntary leave) ─────────────────────────
    case "leaveGame": {
      const { roomId, playerId } = body;
      if (!roomId || !playerId) return err("roomId and playerId required", 400);

      const room = await getRoom(roomId);
      if (!room) return err("Room not found", 404);

      if (room.phase === "waiting") {
        // Remove player from waiting room
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.players.length === 0) {
          removeFromQueue(roomId).catch(() => {});
          await deleteRoom(roomId);
          return ok({ ok: true, message: "Room deleted" });
        }
        // Transfer host if host left
        if (room.hostId === playerId) {
          room.hostId = room.players[0].id;
        }
        await setRoom(roomId, room);
        return ok({ ok: true });
      }

      if (room.phase === "playing") {
        // Mark player as disconnected — bot takes over after 2 min
        handlePlayerLeave(room, playerId);

        // Record rage quit + apply penalty
        const quitResult = await recordRageQuit(playerId);

        // Record as a loss for the quitter (no refund)
        // Entry fee stays in the pot — house keeps it if bot wins

        await setRoom(roomId, room);
        return ok({
          ok: true,
          message: "You left the game. Your entry fee is forfeited.",
          penalty: quitResult.penalty,
          quitCount: quitResult.quitCount,
        });
      }

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
