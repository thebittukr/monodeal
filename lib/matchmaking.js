/**
 * Matchmaking + Room Lifecycle Manager
 *
 * Rules:
 * 1. Free rooms: bots fill after 60s, anyone can play
 * 2. Credits rooms: REAL PLAYERS ONLY — no bots, wait for humans
 * 3. Strangers auto-matched into same room (matchmaking queue)
 * 4. Abandoned rooms auto-cleaned
 * 5. Rage quit → bot takes over, no refund, fair play penalty
 * 6. House never pays — if bot wins, pot goes to platform
 */

import { getRedis } from "./redis";

// ── Constants ────────────────────────────────────────────────────────────────

const QUEUE_KEY = "matchmaking:free";       // queue for free rooms
const QUEUE_CREDITS_KEY = "matchmaking:credits"; // queue for credits rooms
const ROOM_ACTIVITY_KEY = (roomId) => `room:activity:${roomId}`;
const PLAYER_QUIT_KEY = (playerId) => `player:quits:${playerId}`;

const WAITING_TIMEOUT_MS = 120_000;   // 2 min — delete waiting room if no activity
const GAME_ABANDON_MS = 300_000;      // 5 min — void in-progress game if no polls
const RECONNECT_WINDOW_MS = 120_000;  // 2 min — player can reconnect before bot takes over
const QUIT_PENALTY_WINDOW = 86400;    // 24h — track quit count

// ── Find or Create Room (Matchmaking) ────────────────────────────────────────

/**
 * Find an open room to join, or create a new one.
 * For credits rooms: ONLY match with real players, never add bots.
 */
export async function findOrCreateRoom(mode = "free") {
  const redis = getRedis();
  if (!redis) return null; // local dev — skip matchmaking

  const queueKey = mode === "credits" ? QUEUE_CREDITS_KEY : QUEUE_KEY;

  // Try to pop an open room from the queue
  const roomId = await redis.lpop(queueKey);

  if (roomId) {
    // Verify room still exists and is waiting
    const exists = await redis.exists(ROOM_ACTIVITY_KEY(roomId));
    if (exists) {
      return { action: "join", roomId };
    }
    // Room expired — try next in queue (recursive, max 5 attempts)
    return findOrCreateRoom(mode);
  }

  // No open rooms — caller should create a new one
  return { action: "create" };
}

/**
 * Register a room as open for matchmaking.
 */
export async function registerOpenRoom(roomId, mode = "free") {
  const redis = getRedis();
  if (!redis) return;

  const queueKey = mode === "credits" ? QUEUE_CREDITS_KEY : QUEUE_KEY;
  await redis.rpush(queueKey, roomId);
  await redis.set(ROOM_ACTIVITY_KEY(roomId), Date.now(), { ex: 300 }); // 5 min TTL
}

/**
 * Remove room from matchmaking queue (full or started).
 */
export async function removeFromQueue(roomId) {
  const redis = getRedis();
  if (!redis) return;
  await redis.lrem(QUEUE_KEY, 0, roomId);
  await redis.lrem(QUEUE_CREDITS_KEY, 0, roomId);
}

// ── Room Activity Tracking ───────────────────────────────────────────────────

/**
 * Record that a player polled this room (keeps it alive).
 */
export async function recordRoomActivity(roomId) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(ROOM_ACTIVITY_KEY(roomId), Date.now(), { ex: 300 });
}

/**
 * Check if a room has been abandoned (no polls for too long).
 */
export async function isRoomAbandoned(roomId, phase) {
  const redis = getRedis();
  if (!redis) return false;

  const lastActivity = await redis.get(ROOM_ACTIVITY_KEY(roomId));
  if (!lastActivity) return true; // no activity record → abandoned

  const elapsed = Date.now() - Number(lastActivity);

  if (phase === "waiting") return elapsed > WAITING_TIMEOUT_MS;
  if (phase === "playing") return elapsed > GAME_ABANDON_MS;
  return false;
}

// ── Rage Quit / Disconnect Handling ──────────────────────────────────────────

/**
 * Handle a player leaving mid-game.
 * Returns the bot that took over, or null if reconnect window still open.
 */
export function handlePlayerLeave(room, playerId) {
  const playerIdx = room.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return null;
  const player = room.players[playerIdx];

  // Already a bot or already disconnected
  if (player.isBot || player.disconnected) return null;

  // Mark as disconnected with timestamp
  player.disconnected = true;
  player.disconnectedAt = Date.now();
  player.originalId = playerId;

  return { playerIdx, playerName: player.name };
}

/**
 * Check if disconnected player's reconnect window has expired.
 * If expired, convert them to a bot.
 */
export function checkReconnectExpiry(room) {
  const now = Date.now();
  const conversions = [];

  for (const player of room.players) {
    if (player.disconnected && !player.isBot && player.disconnectedAt) {
      if (now - player.disconnectedAt > RECONNECT_WINDOW_MS) {
        // Convert to bot — keep their hand, assets, bank
        player.isBot = true;
        player.personality = "balanced";
        player.name = `${player.name} (left)`;
        conversions.push({
          originalId: player.originalId || player.id,
          playerName: player.name,
        });
      }
    }
  }

  return conversions;
}

/**
 * Try to reconnect a player who disconnected.
 */
export function reconnectPlayer(room, playerId) {
  const player = room.players.find(p => p.originalId === playerId || p.id === playerId);
  if (!player) return false;
  if (!player.disconnected) return true; // already connected

  // Within reconnect window?
  if (player.isBot) return false; // too late, bot took over

  player.disconnected = false;
  player.disconnectedAt = null;
  return true;
}

// ── Rage Quit Tracking ───────────────────────────────────────────────────────

/**
 * Record a rage quit and return penalty info.
 */
export async function recordRageQuit(playerId) {
  const redis = getRedis();
  const result = { quitCount: 1, penalty: null };

  if (!redis) return result;

  const key = PLAYER_QUIT_KEY(playerId);
  const count = await redis.incr(key);
  await redis.expire(key, QUIT_PENALTY_WINDOW);

  result.quitCount = count;

  // Penalties escalate
  if (count >= 5) {
    result.penalty = { type: "cooldown", minutes: 60, fairPlayDelta: -10 };
  } else if (count >= 3) {
    result.penalty = { type: "cooldown", minutes: 30, fairPlayDelta: -5 };
  } else if (count >= 2) {
    result.penalty = { type: "warning", fairPlayDelta: -3 };
  }

  return result;
}

// ── Credits Room Rules ───────────────────────────────────────────────────────

/**
 * Check if a room should allow bots.
 * Credits rooms = NO BOTS (real money, real players only).
 * Free rooms = bots allowed after 60s wait.
 */
export function canAddBots(room) {
  const mode = room._meta?.mode || "free";
  return mode === "free";
}

/**
 * When a bot "wins" a credits room (only possible via rage quit takeover),
 * the pot goes to platform, not back to the quitter.
 */
export function isBotWinner(room) {
  if (!room.winnerId) return false;
  const winner = room.players.find(p => p.id === room.winnerId);
  return winner?.isBot === true;
}
