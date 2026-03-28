/**
 * Zero-trust validation layer.
 * All client input is untrusted. Every request is validated with Zod.
 */
import { z } from "zod";

// ── Request Schemas ──────────────────────────────────────────────────────────

export const CreateRoomSchema = z.object({
  playerName: z.string().min(1).max(20).trim(),
  avatarId: z.string().optional(),
  numPlayers: z.number().int().min(2).max(4).default(4),
  city: z.string().max(20).default("lasvegas"),
  mode: z.enum(["free", "credits"]).default("free"),
  entryFee: z.number().int().min(0).max(100000).default(0),
});

export const JoinRoomSchema = z.object({
  roomId: z.string().min(4).max(10).trim(),
  playerName: z.string().min(1).max(20).trim(),
  avatarId: z.string().optional(),
});

export const PlayMoveSchema = z.object({
  roomId: z.string().min(4).max(10).trim(),
  playerId: z.string().min(1).max(50),
  moveId: z.string().uuid(), // unique per move, anti-replay
  cardIndex: z.number().int().min(0).max(20).optional(),
  action: z
    .enum([
      "playCard",
      "endTurn",
      "respond",
      "bankCard",
      "addToSet",
      "payDebt",
      "selectTarget",
    ])
    .optional(),
  target: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const GameStateSchema = z.object({
  roomId: z.string().min(4).max(10).trim(),
  playerId: z.string().optional(),
});

// ── Validation Helper ────────────────────────────────────────────────────────

export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: `Validation failed: ${errors}` };
  }
  return { success: true, data: result.data };
}

// ── Content-Type Enforcement ─────────────────────────────────────────────────

export function enforceContentType(request: Request): string | null {
  if (request.method === "GET") return null;
  const ct = request.headers.get("content-type");
  if (!ct || !ct.includes("application/json")) {
    return "Content-Type must be application/json";
  }
  return null;
}

// ── Extract Client Info ──────────────────────────────────────────────────────

export function extractClientInfo(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const deviceId =
    request.headers.get("x-device-id") ||
    request.headers.get("x-fingerprint") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ip, deviceId, userAgent };
}
