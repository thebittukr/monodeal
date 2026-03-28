import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser, ensureUserProfile } from "@/lib/auth/session";
import { z } from "zod";

// GET — fetch my profile + stats
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    // Auto-create profile if it doesn't exist (first login)
    await ensureUserProfile(user.id, user.email, user.name);

    // Profile
    const [profile] = await db.select().from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id)).limit(1);

    // Auto-detect country from IP if not set yet
    if (profile && !profile.countryCode) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
              || req.headers.get("x-real-ip")
              || "";
      if (ip && ip !== "127.0.0.1" && ip !== "::1") {
        try {
          const geo = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
          if (geo.ok) {
            const { countryCode } = await geo.json();
            if (countryCode && countryCode.length === 2) {
              await db.update(schema.userProfiles)
                .set({ countryCode: countryCode.toUpperCase() })
                .where(eq(schema.userProfiles.userId, user.id));
              profile.countryCode = countryCode.toUpperCase();
            }
          }
        } catch { /* GeoIP failed — skip silently */ }
      }
    }

    // Rating
    const [rating] = await db.select().from(schema.userRatings)
      .where(eq(schema.userRatings.userId, user.id)).limit(1);

    // Credits
    const [credits] = await db.select().from(schema.credits)
      .where(eq(schema.credits.userId, user.id)).limit(1);

    // Equipped date
    let equippedDate = null;
    if (profile?.equippedGirlfriendId) {
      const [gf] = await db.select().from(schema.girlfriends)
        .where(eq(schema.girlfriends.id, profile.equippedGirlfriendId)).limit(1);
      equippedDate = gf || null;
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
    const isAdmin = adminEmails.includes(user.email);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, image: user.image },
      profile: profile || null,
      rating: rating || null,
      credits: credits ? { balance: credits.balance, locked: credits.lockedBalance } : null,
      equippedDate,
      isAdmin,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST — update profile
const UpdateSchema = z.object({
  username: z.string().min(2).max(20).trim().optional(),
  avatarId: z.string().uuid().optional(),
  countryCode: z.string().length(2).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const body = await req.json();
    const parsed = UpdateSchema.parse(body);

    const updates: Record<string, unknown> = {};
    if (parsed.username !== undefined) updates.username = parsed.username;
    if (parsed.avatarId !== undefined) updates.avatarId = parsed.avatarId;
    if (parsed.countryCode !== undefined) updates.countryCode = parsed.countryCode.toUpperCase();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db.update(schema.userProfiles)
      .set(updates)
      .where(eq(schema.userProfiles.userId, user.id))
      .returning();

    return NextResponse.json({ profile: updated });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg.includes("unique")) return NextResponse.json({ error: "Username taken" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
