import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin only");
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    // Recent fraud events
    const events = await db.select()
      .from(schema.fraudEvents)
      .orderBy(desc(schema.fraudEvents.createdAt))
      .limit(limit);

    // High-risk players
    const riskyPlayers = await db.select({
      userId: schema.playerRiskProfiles.userId,
      riskScore: schema.playerRiskProfiles.riskScore,
      riskLevel: schema.playerRiskProfiles.riskLevel,
      fairPlayScore: schema.playerRiskProfiles.fairPlayScore,
      totalFlags: schema.playerRiskProfiles.totalFlags,
      consecutiveLosses: schema.playerRiskProfiles.consecutiveLosses,
      username: schema.userProfiles.username,
    })
      .from(schema.playerRiskProfiles)
      .leftJoin(schema.userProfiles, sql`${schema.playerRiskProfiles.userId} = ${schema.userProfiles.userId}`)
      .where(sql`${schema.playerRiskProfiles.riskScore} > 3`)
      .orderBy(desc(schema.playerRiskProfiles.riskScore))
      .limit(50);

    // Collusion suspects (pair stats with high scores)
    const collusionPairs = await db.select()
      .from(schema.playerPairStats)
      .where(sql`${schema.playerPairStats.collusionScore} > 3`)
      .orderBy(desc(schema.playerPairStats.collusionScore))
      .limit(20);

    return NextResponse.json({ events, riskyPlayers, collusionPairs });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
