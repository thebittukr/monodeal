/**
 * Password Change/Set API
 * POST { currentPassword?, newPassword }
 * - Authenticated users can change their password
 * - OAuth-only users (random password hash) can set their first password without currentPassword
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // Fetch the full user record with password hash
    const [dbUser] = await db.select().from(schema.users)
      .where(eq(schema.users.id, user.id)).limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If currentPassword is provided, verify it
    if (currentPassword) {
      const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
      }
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(schema.users)
      .set({ passwordHash: newHash })
      .where(eq(schema.users.id, user.id));

    // Invalidate all other sessions (keep current one)
    const cookieStore = (await import("next/headers")).cookies;
    const currentToken = (await cookieStore()).get("session")?.value;
    if (currentToken) {
      await db.delete(schema.sessions)
        .where(eq(schema.sessions.userId, user.id));
      // Re-create current session so user stays logged in
      const { randomBytes } = await import("crypto");
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(schema.sessions).values({ userId: user.id, token, expiresAt });

      const res = NextResponse.json({ ok: true, message: "Password updated. Other sessions invalidated." });
      res.cookies.set("session", token, {
        httpOnly: true,
        path: "/",
        expires: expiresAt,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res;
    }

    return NextResponse.json({ ok: true, message: "Password updated." });
  } catch (err: any) {
    console.error("Password change error:", err);
    return NextResponse.json({ error: err.message || "Failed to update password" }, { status: 500 });
  }
}
