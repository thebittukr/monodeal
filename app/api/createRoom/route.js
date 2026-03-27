import { getRoom, setRoom } from "@/lib/gameStore";
import { createRoom } from "@/lib/gameEngine";
import { securityCheck, errorResponse, successResponse, handlePreflight } from "@/lib/security/middleware";
import { validateRequest, CreateRoomSchema } from "@/lib/security/validation";
import { logAudit } from "@/lib/security/audit";
import { quickRiskCheck } from "@/lib/fraud/riskScoring";

function genRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function OPTIONS(req) {
  return handlePreflight(req);
}

export async function POST(req) {
  // 1. Security check (CORS, rate limit, content-type)
  const security = await securityCheck(req, "createRoom");
  if (!security.allowed) return security.response;

  try {
    const body = await req.json();

    // 2. Validate input with Zod
    const validation = validateRequest(CreateRoomSchema, body);
    if (!validation.success) {
      await logAudit({ action: "createRoom", details: { error: validation.error }, ip: security.context.ip, success: false });
      return errorResponse(req, validation.error);
    }

    const { playerName, numPlayers, city, mode, entryFee } = validation.data;

    // 3. Fraud risk check (if we have a userId from auth — optional for free play)
    // For now, free play doesn't require auth
    // TODO: For credits mode, require auth and check risk

    // 4. Create room
    let roomId;
    do { roomId = genRoomId(); } while (await getRoom(roomId));

    const room = createRoom(roomId, playerName);
    // Attach metadata for fraud tracking
    room._meta = {
      mode,
      entryFee,
      city,
      maxPlayers: numPlayers,
      creatorIp: security.context.ip,
      creatorDevice: security.context.deviceId,
      playerIps: {},
      playerDevices: {},
    };
    room._meta.playerIps[room.hostId] = security.context.ip;
    room._meta.playerDevices[room.hostId] = security.context.deviceId;

    await setRoom(roomId, room);

    // 5. Audit log
    await logAudit({
      action: "createRoom",
      resource: "game_room",
      resourceId: roomId,
      details: { playerName, numPlayers, city, mode, entryFee },
      ip: security.context.ip,
      deviceId: security.context.deviceId,
      success: true,
    });

    return successResponse(req, { roomId, playerId: room.hostId });
  } catch (err) {
    await logAudit({ action: "createRoom", details: { error: err.message }, ip: security.context.ip, success: false });
    return errorResponse(req, err.message, 500);
  }
}
