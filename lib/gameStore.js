/**
 * Room store with Upstash Redis for Vercel production and in-memory fallback for local dev.
 *
 * On Vercel: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * (Vercel → Storage → Connect Upstash KV auto-populates both)
 *
 * Locally: falls back to global.__propertyRushRooms (hot-reload safe)
 */

import { Redis } from "@upstash/redis";

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

// ── In-memory fallback (local dev only) ─────────────────────────────────────
if (!global.__propertyRushRooms) {
  global.__propertyRushRooms = {};
}

const KEY = (roomId) => `pr:room:${roomId}`;
const TTL = 86400; // 24 hours

export async function getRoom(roomId) {
  const r = getRedis();
  if (r) return r.get(KEY(roomId));
  return global.__propertyRushRooms[roomId] ?? null;
}

export async function setRoom(roomId, room) {
  const r = getRedis();
  if (r) {
    await r.set(KEY(roomId), room, { ex: TTL });
  } else {
    global.__propertyRushRooms[roomId] = room;
  }
}

export async function deleteRoom(roomId) {
  const r = getRedis();
  if (r) await r.del(KEY(roomId));
  else delete global.__propertyRushRooms[roomId];
}
