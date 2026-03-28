import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin only");

    // Daily breakdown (last 30 days)
    const dailyUsage = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_txs,
        SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'withdrawal' THEN ABS(amount) ELSE 0 END) as withdrawals,
        SUM(CASE WHEN type = 'game_entry' THEN ABS(amount) ELSE 0 END) as game_entries,
        SUM(CASE WHEN type = 'game_win' THEN amount ELSE 0 END) as game_wins,
        SUM(CASE WHEN type = 'rake' THEN amount ELSE 0 END) as rake,
        SUM(CASE WHEN type = 'bonus' THEN amount ELSE 0 END) as bonuses,
        SUM(CASE WHEN type = 'girlfriend_purchase' THEN ABS(amount) ELSE 0 END) as date_purchases
      FROM credit_transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // By type summary (all time)
    const byType = await db.execute(sql`
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as avg_amount
      FROM credit_transactions
      GROUP BY type
      ORDER BY count DESC
    `);

    // Top spenders
    const topSpenders = await db.execute(sql`
      SELECT
        ct.user_id,
        up.username,
        SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) as total_spent,
        SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END) as total_earned,
        COUNT(*) as tx_count
      FROM credit_transactions ct
      LEFT JOIN user_profiles up ON ct.user_id = up.user_id
      WHERE ct.user_id != 'PLATFORM'
      GROUP BY ct.user_id, up.username
      ORDER BY total_spent DESC
      LIMIT 20
    `);

    return NextResponse.json({
      daily: dailyUsage.rows || [],
      byType: byType.rows || [],
      topSpenders: topSpenders.rows || [],
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
