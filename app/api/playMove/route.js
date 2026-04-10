import { getRoom, setRoom } from "@/lib/gameStore";
import { processMove } from "@/lib/gameEngine";
import { securityCheck, errorResponse, successResponse, handlePreflight } from "@/lib/security/middleware";
import { logAudit, logSecurityEvent } from "@/lib/security/audit";
import { trackGameEvent } from "@/lib/fraud/eventTracker";
import { checkAndMarkMoveId, withGameLock } from "@/lib/security/antiReplay";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { handleGameCompletion } from "@/lib/gameCompletion";

export async function OPTIONS(req) {
  return handlePreflight(req);
}

export async function POST(req) {
  // 1. Security check
  const security = await securityCheck(req, "playMove");
  if (!security.allowed) return security.response;

  try {
    const body = await req.json();
    const { roomId, playerId, move, moveId } = body;

    // 2. Basic validation
    if (!roomId || !playerId || !move) {
      return errorResponse(req, "roomId, playerId, and move are required");
    }

    // 3. Anti-replay: check moveId if provided
    if (moveId) {
      const isFresh = await checkAndMarkMoveId(moveId);
      if (!isFresh) {
        await logSecurityEvent("replay_attempt", { roomId, playerId, moveId }, security.context.ip);
        return errorResponse(req, "Duplicate move rejected", 409);
      }
    }

    // 4. Per-player rate limit (prevent spam)
    const playerRL = await checkRateLimit(playerId, "playMove");
    if (!playerRL.allowed) {
      await logSecurityEvent("player_rate_limit", { roomId, playerId }, security.context.ip);
      return errorResponse(req, "Too fast — slow down", 429);
    }

    // 5. Game state lock — prevent race conditions
    const result = await withGameLock(roomId, async () => {
      const room = await getRoom(roomId);
      if (!room) {
        return { error: "Room not found", status: 404 };
      }

      // 6. Validate it's this player's turn (server-authoritative)
      const currentPlayer = room.players[room.turn];
      if (!currentPlayer || currentPlayer.id !== playerId) {
        await logSecurityEvent("wrong_turn", { roomId, playerId, expectedPlayer: currentPlayer?.id }, security.context.ip);
        return { error: "Not your turn", status: 403 };
      }

      // 7. Track timing for bot detection
      const moveStartTime = room._lastMoveTimestamp || Date.now();
      const moveTimeMs = Date.now() - moveStartTime;

      // 8. Process move (existing game engine — untouched)
      const updated = processMove(room, playerId, move);
      updated._lastMoveTimestamp = Date.now();

      await setRoom(roomId, updated);

      // 9. If game just ended, persist results to DB (async, idempotent)
      if (updated.phase === "ended") {
        handleGameCompletion(updated).catch(err =>
          console.error("[playMove] Game completion error:", err.message)
        );
      }

      // 10. Track event for fraud detection (async, don't block response)
      trackGameEvent({
        playerId,
        roomId,
        action: move.type || "playCard",
        targetPlayer: move.target || undefined,
        moveTimeMs,
        timestamp: Date.now(),
        ip: security.context.ip,
        deviceId: security.context.deviceId,
        cardId: move.cardIndex !== undefined ? String(move.cardIndex) : undefined,
      }).catch(() => {}); // fire and forget

      // 10. Audit log
      logAudit({
        action: "playMove",
        resource: "game_room",
        resourceId: roomId,
        userId: playerId,
        details: { moveType: move.type, cardIndex: move.cardIndex, target: move.target, moveTimeMs },
        ip: security.context.ip,
        success: true,
      }).catch(() => {}); // fire and forget

      return { ok: true };
    });

    if (result === null) {
      // Lock contention — another move is being processed
      return errorResponse(req, "Move in progress — try again", 409);
    }

    if (result.error) {
      return errorResponse(req, result.error, result.status || 400);
    }

    return successResponse(req, { ok: true });
  } catch (err) {
    await logAudit({ action: "playMove", details: { error: err.message }, ip: security.context.ip, success: false });
    return errorResponse(req, err.message, 400);
  }
}
