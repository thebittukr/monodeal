import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/gameStore";
import { joinRoom } from "@/lib/gameEngine";

export async function POST(req) {
  try {
    const { roomId, playerName } = await req.json();
    if (!roomId?.trim() || !playerName?.trim()) {
      return NextResponse.json({ error: "Room ID and player name are required" }, { status: 400 });
    }

    const room = getRoom(roomId.trim().toUpperCase());
    if (!room) {
      return NextResponse.json({ error: "Room not found — check your code" }, { status: 404 });
    }
    if (room.phase !== "waiting") {
      return NextResponse.json({ error: "Game already in progress" }, { status: 400 });
    }
    if (room.players.length >= 4) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    const { room: updatedRoom, playerId } = joinRoom(room, playerName.trim());
    setRoom(roomId.trim().toUpperCase(), updatedRoom);

    return NextResponse.json({ playerId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
