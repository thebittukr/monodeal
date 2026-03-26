import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/gameStore";
import { processMove } from "@/lib/gameEngine";

export async function POST(req) {
  try {
    const { roomId, playerId, move } = await req.json();
    if (!roomId || !playerId || !move) {
      return NextResponse.json({ error: "roomId, playerId, and move are required" }, { status: 400 });
    }

    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const updated = processMove(room, playerId, move);
    setRoom(roomId, updated);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
