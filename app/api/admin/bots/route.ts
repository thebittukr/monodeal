import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin only");

    const bots = await db.select()
      .from(schema.botProfiles)
      .orderBy(desc(schema.botProfiles.eloRating));

    return NextResponse.json({ bots, count: bots.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin only");
    const { action, botId, value } = await req.json();

    if (action === "toggle_active") {
      await db.update(schema.botProfiles)
        .set({ isActive: value })
        .where(eq(schema.botProfiles.botId, botId));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
