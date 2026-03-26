import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/gameStore";
import { createRoom } from "@/lib/gameEngine";

function genRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req) {
  try {
    const { playerName } = await req.json();
    if (!playerName?.trim()) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    let roomId;
    do { roomId = genRoomId(); } while (getRoom(roomId));

    const room = createRoom(roomId, playerName.trim());
    setRoom(roomId, room);

    return NextResponse.json({ roomId, playerId: room.hostId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
