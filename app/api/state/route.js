import { getRoom } from "@/lib/gameStore";
import { sanitizeState } from "@/lib/gameEngine";
import { securityCheck, errorResponse, handlePreflight, corsHeaders } from "@/lib/security/middleware";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return handlePreflight(req);
}

export async function GET(req) {
  // 1. Security check (rate limiting for polling protection)
  const security = await securityCheck(req, "state");
  if (!security.allowed) return security.response;

  const { searchParams } = new URL(req.url);
  const roomId   = searchParams.get("roomId");
  const playerId = searchParams.get("playerId");

  if (!roomId) {
    return errorResponse(req, "roomId is required");
  }

  const room = await getRoom(roomId);
  if (!room) {
    return errorResponse(req, "Room not found", 404);
  }

  // Sanitize state — never leak other players' hidden cards
  const state = playerId ? sanitizeState(room, playerId) : room;

  // Strip internal metadata from response
  const { _meta, _lastMoveTimestamp, ...cleanState } = state;

  return NextResponse.json(cleanState, {
    headers: {
      ...corsHeaders(req),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
