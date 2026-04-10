import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    // ── 2FA Check ──────────────────────────────────────────────────────
    if (user.totpEnabled) {
      // Don't create a session — create a temporary challenge instead
      const challengeToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await db.insert(schema.twoFactorChallenges).values({
        userId: user.id,
        challengeToken,
        expiresAt,
      });

      return NextResponse.json({
        requires2FA: true,
        challengeToken,
      });
    }

    // ── No 2FA — create session as before ──────────────────────────────
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(schema.sessions).values({ userId: user.id, token, expiresAt });

    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set("session", token, { httpOnly: true, path: "/", expires: expiresAt, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
