import { getRoom, setRoom } from "@/lib/gameStore";
import { joinRoom } from "@/lib/gameEngine";
import { securityCheck, errorResponse, successResponse, handlePreflight } from "@/lib/security/middleware";
import { validateRequest, JoinRoomSchema } from "@/lib/security/validation";
import { logAudit } from "@/lib/security/audit";
import { trackRoomParticipants } from "@/lib/fraud/eventTracker";

export async function OPTIONS(req) {
  return handlePreflight(req);
}

export async function POST(req) {
  // 1. Security check
  const security = await securityCheck(req, "joinRoom");
  if (!security.allowed) return security.response;

  try {
    const body = await req.json();

    // 2. Validate input
    const validation = validateRequest(JoinRoomSchema, body);
    if (!validation.success) {
      await logAudit({ action: "joinRoom", details: { error: validation.error }, ip: security.context.ip, success: false });
      return errorResponse(req, validation.error);
    }

    const { roomId, playerName } = validation.data;
    const normalizedRoomId = roomId.trim().toUpperCase();

    const room = await getRoom(normalizedRoomId);
    if (!room) {
      return errorResponse(req, "Room not found — check your code", 404);
    }
    if (room.phase !== "waiting") {
      return errorResponse(req, "Game already in progress");
    }
    if (room.players.length >= (room._meta?.maxPlayers || 4)) {
      return errorResponse(req, "Room is full");
    }

    // 3. Join room
    const { room: updatedRoom, playerId } = joinRoom(room, playerName.trim());

    // 4. Track IP/device for fraud detection
    if (!updatedRoom._meta) updatedRoom._meta = {};
    if (!updatedRoom._meta.playerIps) updatedRoom._meta.playerIps = {};
    if (!updatedRoom._meta.playerDevices) updatedRoom._meta.playerDevices = {};
    updatedRoom._meta.playerIps[playerId] = security.context.ip;
    updatedRoom._meta.playerDevices[playerId] = security.context.deviceId;

    await setRoom(normalizedRoomId, updatedRoom);

    // 5. Track room participants for collusion detection
    const playerIds = updatedRoom.players.map(p => p.id);
    await trackRoomParticipants(
      normalizedRoomId,
      playerIds,
      updatedRoom._meta.playerIps,
      updatedRoom._meta.playerDevices
    );

    // 6. Audit log
    await logAudit({
      action: "joinRoom",
      resource: "game_room",
      resourceId: normalizedRoomId,
      details: { playerName, playerId, playerCount: updatedRoom.players.length },
      ip: security.context.ip,
      deviceId: security.context.deviceId,
      success: true,
    });

    return successResponse(req, { playerId });
  } catch (err) {
    await logAudit({ action: "joinRoom", details: { error: err.message }, ip: security.context.ip, success: false });
    return errorResponse(req, err.message, 500);
  }
}
