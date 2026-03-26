import { NextResponse } from "next/server";
import { getRoom } from "@/lib/gameStore";
import { sanitizeState } from "@/lib/gameEngine";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const roomId   = searchParams.get("roomId");
  const playerId = searchParams.get("playerId");

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const state = playerId ? sanitizeState(room, playerId) : room;

  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
