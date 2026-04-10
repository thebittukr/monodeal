/**
 * Avatars API — list all avatars for the picker
 * GET → { avatars: [...] }
 * Cached in-memory for 5 minutes.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { cached } from "@/lib/cache";

export async function GET() {
  try {
    const avatars = await cached("avatars:all", 300_000, async () => {
      return db.select({
        id: schema.gamerAvatars.id,
        name: schema.gamerAvatars.name,
        imageUrl: schema.gamerAvatars.imageUrl,
        category: schema.gamerAvatars.category,
        isFree: schema.gamerAvatars.isFree,
        priceCredits: schema.gamerAvatars.priceCredits,
      }).from(schema.gamerAvatars);
    });

    return NextResponse.json({ avatars });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, avatars: [] }, { status: 500 });
  }
}
