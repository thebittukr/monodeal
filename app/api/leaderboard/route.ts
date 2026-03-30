/**
 * Leaderboard API — rankings combining real players + bots
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "elo";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    const adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").filter(Boolean));

    // Real players
    const players = await db
      .select({
        userId: schema.userRatings.userId,
        username: schema.userProfiles.username,
        eloRating: schema.userRatings.eloRating,
        tier: schema.userRatings.tier,
        gamesPlayed: schema.userRatings.gamesPlayed,
        gamesWon: schema.userRatings.gamesWon,
        winStreak: schema.userRatings.winStreak,
        bestStreak: schema.userRatings.bestStreak,
        totalEarnings: schema.userRatings.totalEarnings,
        countryCode: schema.userProfiles.countryCode,
      })
      .from(schema.userRatings)
      .leftJoin(schema.userProfiles, sql`${schema.userRatings.userId} = ${schema.userProfiles.userId}`)
      .limit(100);

    // Bots
    const bots = await db
      .select({
        botId: schema.botProfiles.botId,
        displayName: schema.botProfiles.displayName,
        eloRating: schema.botProfiles.eloRating,
        tier: schema.botProfiles.tier,
        gamesPlayed: schema.botProfiles.gamesPlayed,
        gamesWon: schema.botProfiles.gamesWon,
        countryCode: schema.botProfiles.countryCode,
      })
      .from(schema.botProfiles)
      .limit(100);

    // Combine into unified format
    const combined = [
      ...players.filter(p => {
        // Exclude admin users — check by username pattern (admin usernames contain 'admin')
        const uname = (p.username || "").toLowerCase();
        return !uname.includes("admin");
      }).map(p => ({
        userId: p.userId,
        username: p.username || "Anonymous",
        eloRating: p.eloRating || 1000,
        tier: p.tier || "bronze",
        gamesPlayed: p.gamesPlayed || 0,
        gamesWon: p.gamesWon || 0,
        winStreak: p.winStreak || 0,
        bestStreak: p.bestStreak || 0,
        totalEarnings: p.totalEarnings || 0,
        countryCode: p.countryCode,
      })),
      ...bots.map(b => ({
        userId: b.botId,
        username: b.displayName,
        eloRating: b.eloRating || 1000,
        tier: b.tier || "bronze",
        gamesPlayed: b.gamesPlayed || 0,
        gamesWon: b.gamesWon || 0,
        winStreak: 0,
        bestStreak: 0,
        totalEarnings: 0,
        countryCode: b.countryCode,
      })),
    ];

    // Sort
    combined.sort((a, b) => {
      if (type === "wins") return b.gamesWon - a.gamesWon;
      if (type === "earnings") return b.totalEarnings - a.totalEarnings;
      return b.eloRating - a.eloRating;
    });

    // Add rank and limit
    const rankings = combined.slice(0, limit).map((p, i) => ({ ...p, rank: i + 1 }));

    // Most popular dates
    const popularGirlfriends = await db
      .select({
        id: schema.girlfriends.id,
        name: schema.girlfriends.name,
        rarity: schema.girlfriends.rarity,
        thumbnailUrl: schema.girlfriends.thumbnailUrl,
        totalEquipped: schema.girlfriends.totalEquipped,
      })
      .from(schema.girlfriends)
      .orderBy(desc(schema.girlfriends.totalEquipped))
      .limit(10);

    return NextResponse.json({ rankings, popularGirlfriends });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
