/**
 * WebSocket singleton — stores Socket.io server instance.
 * Set by server.js, used by API routes to broadcast state changes.
 */

import { sanitizeState } from "./gameEngine";

/** Get the Socket.io instance from global (set by server.js) */
export function getIO() {
  return globalThis.__socketIO || null;
}

/**
 * Broadcast sanitized room state to all connected players in a room.
 * Each player gets their own sanitized view (opponent hands hidden).
 *
 * @param {string} roomId
 * @param {object} room - Full room state from Redis
 */
export async function broadcastRoomState(roomId, room) {
  const io = getIO();
  if (!io || !room) return;

  const roomChannel = `room:${roomId}`;
  const sockets = await io.in(roomChannel).fetchSockets();

  for (const socket of sockets) {
    const playerId = socket.data?.playerId;
    if (!playerId) continue;

    // Each player gets their own sanitized state (can't see others' cards)
    const state = sanitizeState(room, playerId);
    const { _meta, _lastMoveTimestamp, ...clean } = state;
    socket.emit("state-update", clean);
  }
}

/**
 * Broadcast a simple event to all players in a room.
 */
export function broadcastToRoom(roomId, event, data) {
  const io = getIO();
  if (!io) return;
  io.to(`room:${roomId}`).emit(event, data);
}
