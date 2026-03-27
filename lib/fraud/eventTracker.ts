/**
 * Event Tracker — records every game action for fraud analysis.
 * Stores in Redis for real-time access + DB for long-term analytics.
 */

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

// ── Event Types ──────────────────────────────────────────────────────────────

export interface GameEvent {
  playerId: string;
  roomId: string;
  action: string;
  targetPlayer?: string;
  moveTimeMs?: number; // time taken to decide
  timestamp: number;
  ip: string;
  deviceId: string;
  cardId?: string;
  amount?: number; // for money transfers
}

// ── Track Event (Redis + queue for DB) ───────────────────────────────────────

const EVENT_TTL = 86400 * 7; // 7 days in Redis

export async function trackGameEvent(event: GameEvent): Promise<void> {
  const redis = getRedis();
  if (!redis) return; // skip in local dev

  const key = `events:room:${event.roomId}`;
  const playerKey = `events:player:${event.playerId}`;

  try {
    const pipe = redis.pipeline();

    // Store event in room's event list
    pipe.rpush(key, JSON.stringify(event));
    pipe.expire(key, EVENT_TTL);

    // Store in player's recent events (keep last 500)
    pipe.rpush(playerKey, JSON.stringify(event));
    pipe.ltrim(playerKey, -500, -1);
    pipe.expire(playerKey, EVENT_TTL);

    // Track IP → player mapping
    pipe.sadd(`ip:${event.ip}:players`, event.playerId);
    pipe.expire(`ip:${event.ip}:players`, EVENT_TTL);

    // Track device → player mapping
    if (event.deviceId !== "unknown") {
      pipe.sadd(`device:${event.deviceId}:players`, event.playerId);
      pipe.expire(`device:${event.deviceId}:players`, EVENT_TTL);
    }

    // Track player pair (who played with whom)
    if (event.targetPlayer) {
      const pairKey = sortedPairKey(event.playerId, event.targetPlayer);
      pipe.hincrby(`pair:${pairKey}`, "interactions", 1);
      pipe.expire(`pair:${pairKey}`, EVENT_TTL);

      // Track targeting specifically
      pipe.hincrby(
        `targeting:${event.roomId}:${event.playerId}`,
        event.targetPlayer,
        1
      );
      pipe.expire(`targeting:${event.roomId}:${event.playerId}`, EVENT_TTL);
    }

    await pipe.exec();
  } catch (err) {
    console.error("[EventTracker] Failed to track event:", err);
  }
}

// ── Track Room Participants ──────────────────────────────────────────────────

export async function trackRoomParticipants(
  roomId: string,
  playerIds: string[],
  playerIps: Record<string, string>,
  playerDevices: Record<string, string>
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const pipe = redis.pipeline();

    // Track who was in this room together
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        const pairKey = sortedPairKey(playerIds[i], playerIds[j]);
        pipe.hincrby(`pair:${pairKey}`, "matchesTogether", 1);
        pipe.expire(`pair:${pairKey}`, EVENT_TTL);
      }
    }

    // Check for same IP/device in room
    const ipGroups: Record<string, string[]> = {};
    const deviceGroups: Record<string, string[]> = {};

    for (const pid of playerIds) {
      const ip = playerIps[pid] || "unknown";
      const device = playerDevices[pid] || "unknown";
      if (!ipGroups[ip]) ipGroups[ip] = [];
      ipGroups[ip].push(pid);
      if (device !== "unknown") {
        if (!deviceGroups[device]) deviceGroups[device] = [];
        deviceGroups[device].push(pid);
      }
    }

    // Flag same IP/device (don't block, just track)
    for (const [ip, players] of Object.entries(ipGroups)) {
      if (players.length > 1) {
        pipe.rpush(
          `fraud:same_ip`,
          JSON.stringify({ roomId, ip, players, timestamp: Date.now() })
        );
        pipe.ltrim(`fraud:same_ip`, -1000, -1);
      }
    }

    for (const [device, players] of Object.entries(deviceGroups)) {
      if (players.length > 1) {
        pipe.rpush(
          `fraud:same_device`,
          JSON.stringify({ roomId, device, players, timestamp: Date.now() })
        );
        pipe.ltrim(`fraud:same_device`, -1000, -1);
      }
    }

    await pipe.exec();
  } catch (err) {
    console.error("[EventTracker] Failed to track room participants:", err);
  }
}

// ── Query Helpers ────────────────────────────────────────────────────────────

export async function getPlayersOnSameIp(ip: string): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  const members = await redis.smembers(`ip:${ip}:players`);
  return members as string[];
}

export async function getPlayersOnSameDevice(
  deviceId: string
): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  const members = await redis.smembers(`device:${deviceId}:players`);
  return members as string[];
}

export async function getPairStats(
  playerA: string,
  playerB: string
): Promise<Record<string, number>> {
  const redis = getRedis();
  if (!redis) return {};
  const pairKey = sortedPairKey(playerA, playerB);
  const stats = await redis.hgetall(`pair:${pairKey}`);
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(stats || {})) {
    result[k] = Number(v);
  }
  return result;
}

export async function getTargetingStats(
  roomId: string,
  playerId: string
): Promise<Record<string, number>> {
  const redis = getRedis();
  if (!redis) return {};
  const stats = await redis.hgetall(`targeting:${roomId}:${playerId}`);
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(stats || {})) {
    result[k] = Number(v);
  }
  return result;
}

// ── Utils ────────────────────────────────────────────────────────────────────

function sortedPairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
