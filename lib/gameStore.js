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
const TTL = 18000; // 5 hours

export async function getRoom(roomId) {
  const r = getRedis();
  if (r) {
    // Redis is configured — use it as source of truth.
    // Do NOT fall back to per-instance memory on error: on Vercel each serverless
    // instance has its own empty memory, so a fallback would return null for rooms
    // that exist in Redis (causing false "Room not found" 404s).
    // Let the error propagate → API returns 500 → client retries automatically.
    const data = await r.get(KEY(roomId));
    // Also cache locally so same-instance subsequent reads skip a Redis round-trip
    if (data) global.__propertyRushRooms[roomId] = data;
    return data;
  }
  return global.__propertyRushRooms[roomId] ?? null;
}

export async function setRoom(roomId, room) {
  // Always write to memory so same-instance reads are instant
  global.__propertyRushRooms[roomId] = room;
  const r = getRedis();
  if (r) {
    // Let Redis errors propagate → API returns 500 → client retries.
    // A silent swallow here would leave other instances with stale state.
    await r.set(KEY(roomId), room, { ex: TTL });
  }
}

export async function deleteRoom(roomId) {
  delete global.__propertyRushRooms[roomId];
  const r = getRedis();
  if (r) {
    try { await r.del(KEY(roomId)); } catch {}
  }
}
