/**
 * Admin Avatars API — list, update price/free status, delete
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { invalidateCache } from "@/lib/cache";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) throw new Error("Admin access required");
  return user;
}

export async function GET() {
  try {
    await requireAdmin();
    const avatars = await db.select().from(schema.gamerAvatars).orderBy(schema.gamerAvatars.createdAt);
    return NextResponse.json({ avatars, count: avatars.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Admin access required" ? 403 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { action, id, name, category, isFree, priceCredits, imageUrl } = await req.json();

    if (action === "update" && id) {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (category !== undefined) updates.category = category;
      if (isFree !== undefined) updates.isFree = isFree;
      if (priceCredits !== undefined) updates.priceCredits = priceCredits;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;

      await db.update(schema.gamerAvatars).set(updates).where(eq(schema.gamerAvatars.id, id));
      invalidateCache("avatars:all");
      return NextResponse.json({ ok: true });
    }

    if (action === "delete" && id) {
      await db.delete(schema.gamerAvatars).where(eq(schema.gamerAvatars.id, id));
      invalidateCache("avatars:all");
      return NextResponse.json({ ok: true });
    }

    if (action === "set_free" && id) {
      await db.update(schema.gamerAvatars)
        .set({ isFree: true, priceCredits: 0 })
        .where(eq(schema.gamerAvatars.id, id));
      invalidateCache("avatars:all");
      return NextResponse.json({ ok: true });
    }

    if (action === "set_paid" && id) {
      await db.update(schema.gamerAvatars)
        .set({ isFree: false, priceCredits: priceCredits || 100 })
        .where(eq(schema.gamerAvatars.id, id));
      invalidateCache("avatars:all");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
