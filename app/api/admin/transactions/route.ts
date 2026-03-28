import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin only");
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // filter by type
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    const txs = await db.select()
      .from(schema.creditTransactions)
      .where(type ? eq(schema.creditTransactions.type, type as any) : undefined)
      .orderBy(desc(schema.creditTransactions.createdAt))
      .limit(limit);

    // Revenue summary
    const [revenue] = await db.select({
      totalRake: sql<number>`COALESCE(SUM(CASE WHEN type = 'rake' THEN amount ELSE 0 END), 0)`,
      totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0)`,
      totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN ABS(amount) ELSE 0 END), 0)`,
      totalBonuses: sql<number>`COALESCE(SUM(CASE WHEN type = 'bonus' THEN amount ELSE 0 END), 0)`,
    }).from(schema.creditTransactions);

    return NextResponse.json({ transactions: txs, summary: revenue });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
