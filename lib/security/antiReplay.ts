/**
 * Anti-replay system.
 * Every move must have a unique moveId. Duplicates are rejected.
 * Uses Redis SET with TTL for fast lookups.
 */

import { getRedis } from "../redis";

// In-memory fallback for local dev
const localUsedMoveIds = new Set<string>();
const MOVE_TTL = 3600; // 1 hour

/**
 * Check if a moveId has been used. If not, mark it as used.
 * Returns true if the move is fresh (allowed), false if replayed.
 */
export async function checkAndMarkMoveId(moveId: string): Promise<boolean> {
  const redis = getRedis();

  if (!redis) {
    // Local dev: in-memory
    if (localUsedMoveIds.has(moveId)) return false;
    localUsedMoveIds.add(moveId);
    // Cleanup old entries (keep last 10000)
    if (localUsedMoveIds.size > 10000) {
      const entries = Array.from(localUsedMoveIds);
      for (let i = 0; i < 5000; i++) localUsedMoveIds.delete(entries[i]);
    }
    return true;
  }

  const key = `move:${moveId}`;
  // SET NX = only set if not exists. Returns "OK" if set, null if already exists.
  const result = await redis.set(key, "1", { nx: true, ex: MOVE_TTL });
  return result === "OK";
}

/**
 * Game state locking — prevent race conditions on concurrent moves.
 * Acquires a lock for a room, executes the callback, then releases.
 */
export async function withGameLock<T>(
  roomId: string,
  fn: () => Promise<T>,
  timeoutMs = 5000
): Promise<T | null> {
  const redis = getRedis();
  const lockKey = `lock:room:${roomId}`;
  const lockValue = `${Date.now()}:${Math.random()}`;

  if (!redis) {
    // Local dev: no locking needed (single process)
    return fn();
  }

  // Try to acquire lock
  const acquired = await redis.set(lockKey, lockValue, {
    nx: true,
    px: timeoutMs,
  });

  if (acquired !== "OK") {
    // Lock held by another request — reject
    return null;
  }

  try {
    return await fn();
  } finally {
    // Release lock only if we still own it (compare value)
    const currentValue = await redis.get(lockKey);
    if (currentValue === lockValue) {
      await redis.del(lockKey);
    }
  }
}
