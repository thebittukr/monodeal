/**
 * Admin Stats API — revenue, players, games, fraud overview.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, eq, count } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const [
      totalPlayers,
      totalGames,
      totalRevenue,
      totalGirlfriends,
      fraudFlags,
    ] = await Promise.all([
      db.select({ count: count() }).from(schema.userProfiles),
      db.select({ count: count() }).from(schema.gameRooms),
      db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(schema.creditTransactions)
        .where(eq(schema.creditTransactions.type, "rake")),
      db.select({ count: count() }).from(schema.girlfriends),
      db.select({ count: count() }).from(schema.fraudEvents),
    ]);

    return NextResponse.json({
      players: totalPlayers[0]?.count || 0,
      games: totalGames[0]?.count || 0,
      revenue: totalRevenue[0]?.total || 0,
      girlfriends: totalGirlfriends[0]?.count || 0,
      fraudFlags: fraudFlags[0]?.count || 0,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
