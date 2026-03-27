/**
 * Leaderboard API — rankings by Elo, wins, earnings.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "elo"; // elo | wins | earnings
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    let orderCol;
    switch (type) {
      case "wins":
        orderCol = desc(schema.userRatings.gamesWon);
        break;
      case "earnings":
        orderCol = desc(schema.userRatings.totalEarnings);
        break;
      default:
        orderCol = desc(schema.userRatings.eloRating);
    }

    const rankings = await db
      .select({
        rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${
          type === "wins"
            ? schema.userRatings.gamesWon
            : type === "earnings"
            ? schema.userRatings.totalEarnings
            : schema.userRatings.eloRating
        } DESC)`.as("rank"),
        userId: schema.userRatings.userId,
        username: schema.userProfiles.username,
        eloRating: schema.userRatings.eloRating,
        tier: schema.userRatings.tier,
        gamesPlayed: schema.userRatings.gamesPlayed,
        gamesWon: schema.userRatings.gamesWon,
        winStreak: schema.userRatings.winStreak,
        bestStreak: schema.userRatings.bestStreak,
        totalEarnings: schema.userRatings.totalEarnings,
      })
      .from(schema.userRatings)
      .leftJoin(
        schema.userProfiles,
        sql`${schema.userRatings.userId} = ${schema.userProfiles.userId}`
      )
      .orderBy(orderCol)
      .limit(limit);

    // Most popular girlfriends
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
