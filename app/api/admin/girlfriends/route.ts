/**
 * Admin API for managing girlfriends/boyfriends.
 * CRUD operations: list, create, update, delete.
 * Upload GLB/thumbnails via Vercel Blob from frontend.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";

// TODO: Replace with proper admin role check
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    throw new Error("Admin access required");
  }
  return user;
}

// ── List all girlfriends ─────────────────────────────────────────────────────

export async function GET() {
  try {
    await requireAdmin();
    const girlfriends = await db
      .select()
      .from(schema.girlfriends)
      .orderBy(schema.girlfriends.createdAt);

    return NextResponse.json({ girlfriends, count: girlfriends.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// ── Create / Update / Delete ─────────────────────────────────────────────────

const GirlfriendSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  id: z.string().uuid().optional(), // required for update/delete

  // Create/Update fields
  name: z.string().min(1).max(50).optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
  modelUrl: z.string().url().optional(), // Vercel Blob URL after upload
  thumbnailUrl: z.string().url().optional(),
  priceCredits: z.number().int().min(0).optional(),
  style: z.enum(["anime", "realistic", "fantasy", "cyberpunk", "casual"]).optional(),
  gender: z.enum(["female", "male"]).optional(),
  isStarter: z.boolean().optional(),
  description: z.string().max(500).optional(),
  personality: z.string().max(200).optional(),
  backstory: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = GirlfriendSchema.parse(body);

    if (parsed.action === "create") {
      if (!parsed.name || !parsed.rarity || !parsed.style) {
        return NextResponse.json(
          { error: "name, rarity, and style are required" },
          { status: 400 }
        );
      }

      const [created] = await db
        .insert(schema.girlfriends)
        .values({
          name: parsed.name,
          rarity: parsed.rarity,
          modelUrl: parsed.modelUrl || "",
          thumbnailUrl: parsed.thumbnailUrl || null,
          priceCredits: parsed.priceCredits ?? getDefaultPrice(parsed.rarity),
          style: parsed.style,
          gender: parsed.gender || "female",
          isStarter: parsed.isStarter || false,
          description: parsed.description || null,
          personality: parsed.personality || null,
          backstory: parsed.backstory || null,
        })
        .returning();

      return NextResponse.json({ girlfriend: created });
    }

    if (parsed.action === "update") {
      if (!parsed.id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }

      const updateFields: Record<string, unknown> = {};
      if (parsed.name !== undefined) updateFields.name = parsed.name;
      if (parsed.rarity !== undefined) updateFields.rarity = parsed.rarity;
      if (parsed.modelUrl !== undefined) updateFields.modelUrl = parsed.modelUrl;
      if (parsed.thumbnailUrl !== undefined) updateFields.thumbnailUrl = parsed.thumbnailUrl;
      if (parsed.priceCredits !== undefined) updateFields.priceCredits = parsed.priceCredits;
      if (parsed.style !== undefined) updateFields.style = parsed.style;
      if (parsed.gender !== undefined) updateFields.gender = parsed.gender;
      if (parsed.isStarter !== undefined) updateFields.isStarter = parsed.isStarter;
      if (parsed.description !== undefined) updateFields.description = parsed.description;
      if (parsed.personality !== undefined) updateFields.personality = parsed.personality;
      if (parsed.backstory !== undefined) updateFields.backstory = parsed.backstory;

      const [updated] = await db
        .update(schema.girlfriends)
        .set(updateFields)
        .where(eq(schema.girlfriends.id, parsed.id))
        .returning();

      return NextResponse.json({ girlfriend: updated });
    }

    if (parsed.action === "delete") {
      if (!parsed.id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }

      await db
        .delete(schema.girlfriends)
        .where(eq(schema.girlfriends.id, parsed.id));

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

function getDefaultPrice(rarity: string): number {
  switch (rarity) {
    case "common": return 200;
    case "rare": return 500;
    case "epic": return 2000;
    case "legendary": return 5000;
    default: return 200;
  }
}
