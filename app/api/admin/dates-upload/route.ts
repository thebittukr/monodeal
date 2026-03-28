/**
 * Admin Date Upload API
 * Accepts image (PNG/GIF/APNG) — saves to /public/dates/
 * Works locally. On Railway, files persist within a deployment.
 * For permanent storage, commit files to git and redeploy.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
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
      try {
        const files = await readdir(DATES_DIR);
        for (const f of files) {
          if (!f.startsWith(".")) await unlink(join(DATES_DIR, f)).catch(() => {});
        }
      } catch { /* dir might not exist */ }
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
      const ext = file.name?.split(".").pop()?.toLowerCase() || "png";
      const filename = `${slug}.${ext}`;

      await mkdir(DATES_DIR, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(DATES_DIR, filename), buffer);

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
