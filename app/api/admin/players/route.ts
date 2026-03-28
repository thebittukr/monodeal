import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql, desc, like } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin access required");
  return user;
}

// GET: List players with stats
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    const players = await db
      .select({
        userId: schema.userProfiles.userId,
        username: schema.userProfiles.username,
        countryCode: schema.userProfiles.countryCode,
        level: schema.userProfiles.level,
        xp: schema.userProfiles.xp,
        createdAt: schema.userProfiles.createdAt,
        eloRating: schema.userRatings.eloRating,
        tier: schema.userRatings.tier,
        gamesPlayed: schema.userRatings.gamesPlayed,
        gamesWon: schema.userRatings.gamesWon,
        totalEarnings: schema.userRatings.totalEarnings,
        creditBalance: schema.credits.balance,
        lockedBalance: schema.credits.lockedBalance,
        riskScore: schema.playerRiskProfiles.riskScore,
        riskLevel: schema.playerRiskProfiles.riskLevel,
        fairPlayScore: schema.playerRiskProfiles.fairPlayScore,
      })
      .from(schema.userProfiles)
      .leftJoin(schema.userRatings, sql`${schema.userProfiles.userId} = ${schema.userRatings.userId}`)
      .leftJoin(schema.credits, sql`${schema.userProfiles.userId} = ${schema.credits.userId}`)
      .leftJoin(schema.playerRiskProfiles, sql`${schema.userProfiles.userId} = ${schema.playerRiskProfiles.userId}`)
      .where(search ? like(schema.userProfiles.username, `%${search}%`) : undefined)
      .orderBy(desc(schema.userProfiles.createdAt))
      .limit(limit);

    return NextResponse.json({ players });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}

// POST: Ban/unban/adjust player
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { action, userId, value } = await req.json();

    if (action === "set_risk_level") {
      await db.update(schema.playerRiskProfiles)
        .set({ riskLevel: value, updatedAt: new Date() })
        .where(eq(schema.playerRiskProfiles.userId, userId));
      return NextResponse.json({ ok: true });
    }

    if (action === "reset_risk") {
      await db.update(schema.playerRiskProfiles)
        .set({ riskScore: 0, riskLevel: "normal", updatedAt: new Date() })
        .where(eq(schema.playerRiskProfiles.userId, userId));
      return NextResponse.json({ ok: true });
    }

    if (action === "add_credits") {
      await db.update(schema.credits)
        .set({ balance: sql`${schema.credits.balance} + ${parseInt(value)}`, updatedAt: new Date() })
        .where(eq(schema.credits.userId, userId));
      await db.insert(schema.creditTransactions).values({
        userId, type: "bonus", amount: parseInt(value), balanceAfter: 0, status: "confirmed",
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
