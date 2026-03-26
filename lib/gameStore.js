/**
 * In-memory room store.
 * Uses `global` so state survives Next.js hot-reloads in development.
 *
 * ⚠️  For production (multi-instance) replace with Redis / Vercel KV / Upstash.
 */

if (!global.__propertyRushRooms) {
  global.__propertyRushRooms = {};
}

export function getRoom(roomId) {
  return global.__propertyRushRooms[roomId] ?? null;
}

export function setRoom(roomId, room) {
  global.__propertyRushRooms[roomId] = room;
}

export function deleteRoom(roomId) {
  delete global.__propertyRushRooms[roomId];
}
