/**
 * Admin Date Upload API
 * Accepts green screen MP4 → converts to transparent APNG → saves to /public/dates/
 * Also creates/updates the DB entry
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { writeFile, mkdir, unlink, readdir } from "fs/promises";
import { execSync } from "child_process";
import { join } from "path";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
const DATES_DIR = join(process.cwd(), "public", "dates");

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
      await db.delete(schema.userGirlfriends);
      await db.delete(schema.girlfriends);
      // Clean up files
      try {
        const files = await readdir(DATES_DIR);
        for (const f of files) {
          if (f !== ".gitkeep") await unlink(join(DATES_DIR, f)).catch(() => {});
        }
      } catch { /* dir might not exist */ }
      return NextResponse.json({ ok: true, message: "All dates deleted" });
    }

    // ── Upload new date ───────────────────────────────────────────────
    if (action === "upload") {
      const file = formData.get("video") as File;
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
        return NextResponse.json({ error: "Video file and name required" }, { status: 400 });
      }

      // Slugify name for filename
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

      // Save uploaded MP4
      await mkdir(DATES_DIR, { recursive: true });
      const mp4Path = join(DATES_DIR, `${slug}.mp4`);
      const pngPath = join(DATES_DIR, `${slug}.png`);
      const framesDir = join(DATES_DIR, `${slug}-frames`);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(mp4Path, buffer);

      // Convert: green screen MP4 → transparent PNG frames → APNG
      try {
        await mkdir(framesDir, { recursive: true });

        // Step 1: Extract transparent frames
        execSync(
          `ffmpeg -y -i "${mp4Path}" -vf "format=rgba,chromakey=0x00FF00:0.3:0.1,scale=300:-1,fps=10" "${framesDir}/f%04d.png"`,
          { timeout: 60000 }
        );

        // Step 2: Combine to APNG
        execSync(
          `ffmpeg -y -framerate 10 -i "${framesDir}/f%04d.png" -plays 0 -f apng "${pngPath}"`,
          { timeout: 60000 }
        );

        // Cleanup temp files
        execSync(`rm -rf "${framesDir}" "${mp4Path}"`);
      } catch (err) {
        // Cleanup on failure
        execSync(`rm -rf "${framesDir}" "${mp4Path}" "${pngPath}"`, { stdio: "ignore" });
        return NextResponse.json({ error: `Conversion failed: ${(err as Error).message}` }, { status: 500 });
      }

      // Create DB entry
      const thumbnailUrl = `/dates/${slug}.png`;
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
