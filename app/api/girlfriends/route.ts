/**
 * Player-facing girlfriend API.
 * Browse shop, buy, equip, view collection.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { debitUser } from "@/lib/wallet/credits";
import { cached, invalidateCache } from "@/lib/cache";

// ── GET: Browse shop or my collection ────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view"); // "shop" | "collection"

  if (view === "collection") {
    // Require auth for collection
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    // Get user's owned girlfriends with details
    const owned = await db
      .select({
        id: schema.girlfriends.id,
        name: schema.girlfriends.name,
        rarity: schema.girlfriends.rarity,
        modelUrl: schema.girlfriends.modelUrl,
        thumbnailUrl: schema.girlfriends.thumbnailUrl,
        style: schema.girlfriends.style,
        gender: schema.girlfriends.gender,
        description: schema.girlfriends.description,
        personality: schema.girlfriends.personality,
        backstory: schema.girlfriends.backstory,
        equipped: schema.userGirlfriends.equipped,
        purchasedAt: schema.userGirlfriends.purchasedAt,
      })
      .from(schema.userGirlfriends)
      .innerJoin(
        schema.girlfriends,
        eq(schema.userGirlfriends.girlfriendId, schema.girlfriends.id)
      )
      .where(eq(schema.userGirlfriends.userId, user.id));

    return NextResponse.json({ girlfriends: owned });
  }

  // Default: shop view (public) — cached 5 min
  const all = await cached("girlfriends:shop", 300_000, async () => {
    return db
      .select({
        id: schema.girlfriends.id,
        name: schema.girlfriends.name,
        rarity: schema.girlfriends.rarity,
        modelUrl: schema.girlfriends.modelUrl,
        thumbnailUrl: schema.girlfriends.thumbnailUrl,
        priceCredits: schema.girlfriends.priceCredits,
        style: schema.girlfriends.style,
        gender: schema.girlfriends.gender,
        isStarter: schema.girlfriends.isStarter,
        description: schema.girlfriends.description,
        personality: schema.girlfriends.personality,
        backstory: schema.girlfriends.backstory,
        totalEquipped: schema.girlfriends.totalEquipped,
      })
      .from(schema.girlfriends)
      .orderBy(sql`
        CASE WHEN is_starter = true THEN 0 ELSE 1 END,
        CASE rarity
          WHEN 'common' THEN 1
          WHEN 'rare' THEN 2
          WHEN 'epic' THEN 3
          WHEN 'legendary' THEN 4
        END
      `);
  });

  return NextResponse.json({ girlfriends: all });
}

// ── POST: Buy or Equip ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const { action, girlfriendId } = await req.json();

    if (action === "buy") {
      // Get girlfriend details
      const [gf] = await db
        .select()
        .from(schema.girlfriends)
        .where(eq(schema.girlfriends.id, girlfriendId))
        .limit(1);

      if (!gf) {
        return NextResponse.json({ error: "Girlfriend not found" }, { status: 404 });
      }

      // Check if already owned
      const [existing] = await db
        .select()
        .from(schema.userGirlfriends)
        .where(
          and(
            eq(schema.userGirlfriends.userId, user.id),
            eq(schema.userGirlfriends.girlfriendId, girlfriendId)
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json({ error: "Already owned" }, { status: 400 });
      }

      // Starter girlfriends are free
      if (!gf.isStarter && gf.priceCredits > 0) {
        await debitUser(user.id, gf.priceCredits, "girlfriend_purchase", girlfriendId);
      }

      // Add to collection
      await db.insert(schema.userGirlfriends).values({
        userId: user.id,
        girlfriendId,
        equipped: false,
      });

      // Increment popularity counter
      await db
        .update(schema.girlfriends)
        .set({ totalEquipped: sql`${schema.girlfriends.totalEquipped} + 1` })
        .where(eq(schema.girlfriends.id, girlfriendId));

      invalidateCache("girlfriends:shop"); // bust cache on purchase
      return NextResponse.json({ ok: true, message: `${gf.name} is yours!` });
    }

    if (action === "equip") {
      // Unequip all first
      await db
        .update(schema.userGirlfriends)
        .set({ equipped: false })
        .where(eq(schema.userGirlfriends.userId, user.id));

      // Equip selected
      await db
        .update(schema.userGirlfriends)
        .set({ equipped: true })
        .where(
          and(
            eq(schema.userGirlfriends.userId, user.id),
            eq(schema.userGirlfriends.girlfriendId, girlfriendId)
          )
        );

      // Update profile
      await db
        .update(schema.userProfiles)
        .set({ equippedGirlfriendId: girlfriendId })
        .where(eq(schema.userProfiles.userId, user.id));

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
