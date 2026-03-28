/**
 * Admin Date Upload API
 * - PNG/GIF: saved directly
 * - MP4 (green screen): auto-converts to transparent APNG if ffmpeg available
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import { execSync } from "child_process";
import { join } from "path";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
const DATES_DIR = join(process.cwd(), "public", "dates");

function hasFFmpeg(): boolean {
  try { execSync("which ffmpeg", { stdio: "ignore" }); return true; } catch { return false; }
}

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
      try {
        const files = await readdir(DATES_DIR);
        for (const f of files) {
          if (!f.startsWith(".")) await unlink(join(DATES_DIR, f)).catch(() => {});
        }
      } catch {}
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
      await mkdir(DATES_DIR, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      const isVideo = file.type?.includes("video") || file.name?.endsWith(".mp4");
      let filename: string;

      if (isVideo) {
        // MP4 green screen → convert to transparent APNG
        if (!hasFFmpeg()) {
          return NextResponse.json({
            error: "ffmpeg not available on this server. Upload from localhost (which has ffmpeg) or upload a pre-converted PNG/GIF instead."
          }, { status: 400 });
        }

        const mp4Path = join(DATES_DIR, `${slug}-temp.mp4`);
        const framesDir = join(DATES_DIR, `${slug}-frames`);
        const pngPath = join(DATES_DIR, `${slug}.png`);

        try {
          await writeFile(mp4Path, buffer);
          await mkdir(framesDir, { recursive: true });
          execSync(`ffmpeg -y -i "${mp4Path}" -vf "format=rgba,chromakey=0x00FF00:0.2:0.08,despill=type=green:mix=0.5,scale=300:-1,fps=10" "${framesDir}/f%04d.png"`, { timeout: 60000 });
          execSync(`ffmpeg -y -framerate 10 -i "${framesDir}/f%04d.png" -plays 0 -f apng "${pngPath}"`, { timeout: 60000 });
          execSync(`rm -rf "${framesDir}" "${mp4Path}"`);
          filename = `${slug}.png`;
        } catch (err) {
          execSync(`rm -rf "${framesDir}" "${mp4Path}"`, { stdio: "ignore" });
          return NextResponse.json({ error: `Conversion failed: ${(err as Error).message}` }, { status: 500 });
        }
      } else {
        // Direct image upload
        const ext = file.name?.split(".").pop()?.toLowerCase() || "png";
        filename = `${slug}.${ext}`;
        await writeFile(join(DATES_DIR, filename), buffer);
      }

      const thumbnailUrl = `/dates/${filename}`;
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
