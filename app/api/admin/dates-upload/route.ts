/**
 * Admin Date Upload API
 * Compresses with sharp → uploads to Cloudflare R2 → stores URL in DB
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const R2_BUCKET = process.env.R2_BUCKET || "propertyrush";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ""; // e.g. https://dates.propertyrush.com

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const formData = await req.formData();
    const action = formData.get("action") as string;

    if (action === "delete_all") {
      // Delete all R2 objects
      try {
        const list = await R2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: "dates/" }));
        if (list.Contents?.length) {
          await R2.send(new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: { Objects: list.Contents.map(o => ({ Key: o.Key })) },
          }));
        }
      } catch { /* R2 cleanup optional */ }
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

      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const buffer = Buffer.from(await file.arrayBuffer());
      const isGif = file.type === "image/gif" || file.name?.endsWith(".gif");

      let compressed: Buffer;
      let contentType: string;
      let ext: string;

      if (isGif) {
        compressed = await sharp(buffer, { animated: true })
          .resize(400, 400, { fit: "inside", withoutEnlargement: true })
          .gif({ effort: 7 })
          .toBuffer();
        contentType = "image/gif";
        ext = "gif";
      } else {
        compressed = await sharp(buffer)
          .resize(500, 500, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        contentType = "image/webp";
        ext = "webp";
      }

      // Upload to R2
      const key = `dates/${slug}.${ext}`;
      await R2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: compressed,
        ContentType: contentType,
      }));

      const thumbnailUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : key;
      const sizeKB = Math.round(compressed.length / 1024);

      const [created] = await db.insert(schema.girlfriends).values({
        name,
        rarity: rarity as any,
        modelUrl: "",
        thumbnailUrl,
        priceCredits,
        style: style as any,
        gender: gender as any,
        isStarter,
        description: description || null,
        personality: personality || null,
        backstory: backstory || null,
      }).returning();

      return NextResponse.json({ ok: true, girlfriend: created, thumbnailUrl, sizeKB });
    }

    // ── Re-upload image for existing date ─────────────────────────────
    if (action === "reupload") {
      const file = formData.get("image") as File;
      const id = formData.get("id") as string;

      if (!file || !id) {
        return NextResponse.json({ error: "File and date ID required" }, { status: 400 });
      }

      // Get existing date to determine slug
      const [existing] = await db.select().from(schema.girlfriends)
        .where(eq(schema.girlfriends.id, id)).limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Date not found" }, { status: 404 });
      }

      const slug = existing.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const buffer = Buffer.from(await file.arrayBuffer());
      const isGif = file.type === "image/gif" || file.name?.endsWith(".gif");

      let compressed: Buffer;
      let contentType: string;
      let ext: string;

      if (isGif) {
        compressed = await sharp(buffer, { animated: true })
          .resize(400, 400, { fit: "inside", withoutEnlargement: true })
          .gif({ effort: 7 })
          .toBuffer();
        contentType = "image/gif";
        ext = "gif";
      } else {
        compressed = await sharp(buffer)
          .resize(500, 500, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        contentType = "image/webp";
        ext = "webp";
      }

      // Upload to R2 (overwrites existing)
      const key = `dates/${slug}.${ext}`;
      await R2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: compressed,
        ContentType: contentType,
      }));

      const thumbnailUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : key;
      const sizeKB = Math.round(compressed.length / 1024);

      // Update DB with new URL
      await db.update(schema.girlfriends)
        .set({ thumbnailUrl })
        .where(eq(schema.girlfriends.id, id));

      return NextResponse.json({ ok: true, thumbnailUrl, sizeKB });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
