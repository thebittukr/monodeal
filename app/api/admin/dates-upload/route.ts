/**
 * Admin Date Upload API
 * Accepts image (PNG/GIF/APNG) OR green screen MP4
 * Stores in Vercel Blob → creates DB entry
 * MP4 conversion via ffmpeg (only works locally, not on Railway)
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { put, del, list } from "@vercel/blob";
import { execSync } from "child_process";
import { writeFile, mkdir, unlink, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const formData = await req.formData();
    const action = formData.get("action") as string;

    // ── Delete all dates ──────────────────────────────────────────────
    if (action === "delete_all") {
      // Delete all blob files
      try {
        const blobs = await list({ prefix: "dates/" });
        for (const blob of blobs.blobs) {
          await del(blob.url);
        }
      } catch { /* blob cleanup optional */ }

      // Delete DB entries
      await db.delete(schema.userGirlfriends);
      await db.delete(schema.girlfriends);
      return NextResponse.json({ ok: true, message: "All dates deleted" });
    }

    // ── Upload new date ───────────────────────────────────────────────
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
      const isVideo = file.type?.includes("video") || file.name?.endsWith(".mp4");
      let thumbnailUrl = "";

      if (isVideo) {
        // MP4 → convert with ffmpeg (localhost only)
        try {
          const tmp = join(tmpdir(), `date-${slug}`);
          await mkdir(tmp, { recursive: true });
          const mp4Path = join(tmp, "input.mp4");
          const framesDir = join(tmp, "frames");
          const pngPath = join(tmp, "output.png");
          await mkdir(framesDir, { recursive: true });

          const buffer = Buffer.from(await file.arrayBuffer());
          await writeFile(mp4Path, buffer);

          execSync(`ffmpeg -y -i "${mp4Path}" -vf "format=rgba,chromakey=0x00FF00:0.3:0.1,scale=300:-1,fps=10" "${framesDir}/f%04d.png"`, { timeout: 60000 });
          execSync(`ffmpeg -y -framerate 10 -i "${framesDir}/f%04d.png" -plays 0 -f apng "${pngPath}"`, { timeout: 60000 });

          const pngBuffer = await import("fs").then(fs => fs.readFileSync(pngPath));
          const blob = await put(`dates/${slug}.png`, pngBuffer, { access: "public", contentType: "image/png" });
          thumbnailUrl = blob.url;

          execSync(`rm -rf "${tmp}"`);
        } catch (err) {
          return NextResponse.json({ error: `ffmpeg conversion failed. Upload a PNG/GIF instead. ${(err as Error).message}` }, { status: 500 });
        }
      } else {
        // Direct image upload (PNG/GIF/APNG)
        const ext = file.name?.split(".").pop()?.toLowerCase() || "png";
        const buffer = Buffer.from(await file.arrayBuffer());
        const blob = await put(`dates/${slug}.${ext}`, buffer, { access: "public", contentType: file.type || "image/png" });
        thumbnailUrl = blob.url;
      }

      // Create DB entry
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

      return NextResponse.json({ ok: true, girlfriend: created, thumbnailUrl });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
