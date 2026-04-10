/**
 * Game Completion Handler
 * Called when a game ends (phase="ended") to persist results to database.
 * Handles: gameRooms, gamePlayers, userRatings, leaderboards, credits settlement.
 *
 * Uses a Redis flag to ensure completion runs exactly once per game.
 */

import { db, schema } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { eq, sql, and } from "drizzle-orm";
import { calculateRake } from "@/lib/rng/rake";
import { settleGame } from "@/lib/wallet/credits";

const COMPLETION_TTL = 3600; // 1 hour lock

/**
 * Process game completion — idempotent, runs once per room.
 * Call this whenever you detect room.phase === "ended".
 *
 * @param {object} room - The full room object from Redis
 * @returns {boolean} true if completion was processed, false if already done
 */
export async function handleGameCompletion(room) {
  if (!room || room.phase !== "ended" || !room.winnerId) return false;

  const roomId = room.roomId || room.id;
  if (!roomId) return false;

  // Idempotency: check Redis flag to prevent double-processing
  const redis = getRedis();
  if (redis) {
    const key = `game:completed:${roomId}`;
    const alreadyDone = await redis.get(key);
    if (alreadyDone) return false;
    // Set flag immediately to prevent race conditions
    await redis.set(key, "1", { ex: COMPLETION_TTL });
  }

  // Also check in-memory flag on the room object
  if (room._completionProcessed) return false;
  room._completionProcessed = true;

  try {
    const winnerId = room.winnerId;
    const players = room.players || [];
    const entryFee = room.entryFee || 0;
    const mode = room.mode || "free";

    // Separate real players from bots — use userId (DB UUID) for DB operations
    const realPlayers = players.filter(p => !p.isBot && p.userId);
    const winnerPlayer = players.find(p => p.id === winnerId);
    const winnerDbId = winnerPlayer?.userId || null;
    // For credit settlement, only use DB user IDs
    const allPlayerIds = players.map(p => p.id);
    const loserIds = allPlayerIds.filter(id => id !== winnerId);

    console.log(`[GameCompletion] Room ${roomId}: ${winnerPlayer?.name || winnerId} wins! (${players.length} players, ${mode} mode, ${entryFee} entry)`);

    // ── 1. Update gameRooms table ──────────────────────────────────────
    try {
      await db.update(schema.gameRooms)
        .set({
          status: "completed",
          completedAt: new Date(),
          // Reveal provably fair data
          serverSeed: room._proof?.serverSeed || room.fairnessProof?.serverSeed || null,
          deckOrder: room.fairnessProof?.deckOrder || null,
        })
        .where(eq(schema.gameRooms.roomCode, roomId));
    } catch (err) {
      console.error("[GameCompletion] Failed to update gameRooms:", err.message);
    }

    // ── 2. Update gamePlayers table ────────────────────────────────────
    try {
      // Mark winner
      await db.update(schema.gamePlayers)
        .set({ status: "winner" })
        .where(
          and(
            eq(schema.gamePlayers.roomId, roomId),
            eq(schema.gamePlayers.userId, winnerId)
          )
        );

      // Mark losers as eliminated
      for (const loserId of loserIds) {
        await db.update(schema.gamePlayers)
          .set({ status: "eliminated" })
          .where(
            and(
              eq(schema.gamePlayers.roomId, roomId),
              eq(schema.gamePlayers.userId, loserId)
            )
          );
      }
    } catch (err) {
      // gamePlayers rows may not exist for quick/casual games
      console.error("[GameCompletion] Failed to update gamePlayers:", err.message);
    }

    // ── 3. Settle credits (if credits mode) ────────────────────────────
    if (mode === "credits" && entryFee > 0) {
      try {
        const rake = calculateRake(entryFee, players.length);
        const realLoserDbIds = players
          .filter(p => p.id !== winnerId && !p.isBot && p.userId)
          .map(p => p.userId);
        if (winnerDbId) {
          await settleGame(
            winnerDbId,
            realLoserDbIds,
            entryFee,
            rake.rakeAmount,
            rake.winnerPayout,
            roomId
          );
        }
        console.log(`[GameCompletion] Credits settled: winner gets ${rake.winnerPayout}, rake ${rake.rakeAmount}`);
      } catch (err) {
        console.error("[GameCompletion] Failed to settle credits:", err.message);
      }
    }

    // ── 4. Update userRatings for real players ─────────────────────────
    for (const player of realPlayers) {
      try {
        const dbId = player.userId; // DB UUID, not in-game ID
        if (!dbId) continue; // skip guests without DB accounts
        const isWinner = player.id === winnerId;
        const eloChange = isWinner ? 25 : -15; // simple Elo delta

        // Upsert user rating
        await db.insert(schema.userRatings)
          .values({
            userId: dbId,
            gamesPlayed: 1,
            gamesWon: isWinner ? 1 : 0,
            winStreak: isWinner ? 1 : 0,
            bestStreak: isWinner ? 1 : 0,
            eloRating: 1000 + eloChange,
            totalEarnings: isWinner ? (entryFee > 0 ? calculateRake(entryFee, players.length).winnerPayout : 0) : 0,
            totalLosses: !isWinner ? entryFee : 0,
          })
          .onConflictDoUpdate({
            target: schema.userRatings.userId,
            set: {
              gamesPlayed: sql`${schema.userRatings.gamesPlayed} + 1`,
              gamesWon: isWinner
                ? sql`${schema.userRatings.gamesWon} + 1`
                : schema.userRatings.gamesWon,
              eloRating: sql`${schema.userRatings.eloRating} + ${eloChange}`,
              winStreak: isWinner
                ? sql`${schema.userRatings.winStreak} + 1`
                : sql`0`,
              bestStreak: isWinner
                ? sql`GREATEST(${schema.userRatings.bestStreak}, ${schema.userRatings.winStreak} + 1)`
                : schema.userRatings.bestStreak,
              totalEarnings: isWinner && entryFee > 0
                ? sql`${schema.userRatings.totalEarnings} + ${calculateRake(entryFee, players.length).winnerPayout}`
                : schema.userRatings.totalEarnings,
              totalLosses: !isWinner
                ? sql`${schema.userRatings.totalLosses} + ${entryFee}`
                : schema.userRatings.totalLosses,
              updatedAt: new Date(),
            },
          });
      } catch (err) {
        console.error(`[GameCompletion] Failed to update rating for ${player.id}:`, err.message);
      }
    }

    // ── 5. Update bot profiles stats ───────────────────────────────────
    for (const player of players.filter(p => p.isBot)) {
      try {
        const isWinner = player.id === winnerId;
        await db.update(schema.botProfiles)
          .set({
            gamesPlayed: sql`${schema.botProfiles.gamesPlayed} + 1`,
            gamesWon: isWinner
              ? sql`${schema.botProfiles.gamesWon} + 1`
              : schema.botProfiles.gamesWon,
          })
          .where(eq(schema.botProfiles.botId, player.id));
      } catch (err) {
        // Bot may not have a profile row — that's fine
      }
    }

    // ── 6. Update leaderboards (all periods) ───────────────────────────
    for (const player of realPlayers) {
      const dbId = player.userId;
      if (!dbId) continue;
      const isWinner = player.id === winnerId;
      for (const period of ["daily", "weekly", "all_time"]) {
        try {
          await db.insert(schema.leaderboards)
            .values({
              userId: dbId,
              period,
              gamesPlayed: 1,
              gamesWon: isWinner ? 1 : 0,
              totalEarnings: isWinner && entryFee > 0
                ? calculateRake(entryFee, players.length).winnerPayout
                : 0,
              eloRating: 1000,
            })
            .onConflictDoUpdate({
              target: [schema.leaderboards.userId, schema.leaderboards.period],
              set: {
                gamesPlayed: sql`${schema.leaderboards.gamesPlayed} + 1`,
                gamesWon: isWinner
                  ? sql`${schema.leaderboards.gamesWon} + 1`
                  : schema.leaderboards.gamesWon,
                totalEarnings: isWinner && entryFee > 0
                  ? sql`${schema.leaderboards.totalEarnings} + ${calculateRake(entryFee, players.length).winnerPayout}`
                  : schema.leaderboards.totalEarnings,
                updatedAt: new Date(),
              },
            });
        } catch (err) {
          // Leaderboard update is non-critical
        }
      }
    }

    console.log(`[GameCompletion] Room ${roomId} fully processed.`);
    return true;
  } catch (err) {
    console.error("[GameCompletion] Unexpected error:", err);
    // Clear the Redis flag so it can retry
    if (redis) {
      try { await redis.del(`game:completed:${roomId}`); } catch {}
    }
    return false;
  }
}
