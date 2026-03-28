/**
 * Admin Date Upload API
 * Compresses images with sharp → stores in DB as base64 data URL
 * No filesystem dependency — works on Railway
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import sharp from "sharp";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "delete_all") {
      await db.delete(schema.userGirlfriends);
      await db.delete(schema.girlfriends);
      return NextResponse.json({ ok: true, message: "All dates deleted" });
    }

    if (action === "upload") {
      const file = formData.get("image") as File;
      const name = formData.get("name") as string;
      const rarity = (formData.get("rarity") as string) || "common";
      const style = (formData.get("style") as string) || "anime";
      const gender = (formData.get("gender") as string) || "female";
      const priceCredits = parseInt(formData.get("priceCredits") as string) || 0;
      const isStarter = formData.get("isStarter") === "true";
      const personality = (formData.get("personality") as string) || "";
      const description = (formData.get("description") as string) || "";
      const backstory = (formData.get("backstory") as string) || "";

      if (!file || !name) {
        return NextResponse.json({ error: "File and name required" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const isGif = file.type === "image/gif" || file.name?.endsWith(".gif");

      let compressed: Buffer;
      let mimeType: string;

      if (isGif) {
        // GIFs: resize only, keep animation (sharp preserves animated GIF)
        compressed = await sharp(buffer, { animated: true })
          .resize(400, 400, { fit: "inside", withoutEnlargement: true })
          .gif({ effort: 7 })
          .toBuffer();
        mimeType = "image/gif";
      } else {
        // PNG/JPG: compress to WebP for smallest size
        compressed = await sharp(buffer)
          .resize(500, 500, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        mimeType = "image/webp";
      }

      // Store as data URL in thumbnailUrl field
      const dataUrl = `data:${mimeType};base64,${compressed.toString("base64")}`;
      const sizeKB = Math.round(compressed.length / 1024);

      const [created] = await db.insert(schema.girlfriends).values({
        name,
        rarity: rarity as any,
        modelUrl: "",
        thumbnailUrl: dataUrl,
        priceCredits,
        style: style as any,
        gender: gender as any,
        isStarter,
        description: description || null,
        personality: personality || null,
        backstory: backstory || null,
      }).returning();

      return NextResponse.json({
        ok: true,
        girlfriend: { ...created, thumbnailUrl: `[${sizeKB}KB data URL]` },
        sizeKB,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
