import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin only");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    const games = await db.select()
      .from(schema.gameRooms)
      .where(status ? eq(schema.gameRooms.status, status as any) : undefined)
      .orderBy(desc(schema.gameRooms.createdAt))
      .limit(limit);

    return NextResponse.json({ games });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
