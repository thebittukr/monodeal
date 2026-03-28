import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin only");

    // All wallets with owner info
    const wallets = await db
      .select({
        walletId: schema.wallets.id,
        userId: schema.wallets.userId,
        type: schema.wallets.type,
        address: schema.wallets.address,
        chain: schema.wallets.chain,
        createdAt: schema.wallets.createdAt,
        username: schema.userProfiles.username,
        creditBalance: schema.credits.balance,
        lockedBalance: schema.credits.lockedBalance,
      })
      .from(schema.wallets)
      .leftJoin(schema.userProfiles, sql`${schema.wallets.userId} = ${schema.userProfiles.userId}`)
      .leftJoin(schema.credits, sql`${schema.wallets.userId} = ${schema.credits.userId}`)
      .orderBy(desc(schema.wallets.createdAt))
      .limit(200);

    // Platform totals
    const [totals] = await db.select({
      totalWallets: sql<number>`COUNT(*)`,
      custodialCount: sql<number>`SUM(CASE WHEN type = 'custodial' THEN 1 ELSE 0 END)`,
      externalCount: sql<number>`SUM(CASE WHEN type = 'external' THEN 1 ELSE 0 END)`,
    }).from(schema.wallets);

    const [creditTotals] = await db.select({
      totalCreditsInCirculation: sql<number>`COALESCE(SUM(balance + locked_balance), 0)`,
      totalLocked: sql<number>`COALESCE(SUM(locked_balance), 0)`,
    }).from(schema.credits);

    return NextResponse.json({
      wallets,
      summary: {
        ...totals,
        ...creditTotals,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
