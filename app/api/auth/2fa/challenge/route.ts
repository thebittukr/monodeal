/**
 * 2FA Challenge — Verify TOTP/recovery code during login, create full session
 * POST { challengeToken, code }
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { verifyTotpCode, verifyRecoveryCode } from "@/lib/auth/totp";
import { getRedis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { challengeToken, code } = await req.json();

    if (!challengeToken || !code) {
      return NextResponse.json({ error: "Challenge token and code are required" }, { status: 400 });
    }

    // Rate limit: max 5 attempts per challenge token
    const redis = getRedis();
    if (redis) {
      const rlKey = `2fa_attempts:${challengeToken}`;
      const attempts = parseInt(await redis.get(rlKey) || "0");
      if (attempts >= 5) {
        return NextResponse.json({ error: "Too many attempts. Please log in again." }, { status: 429 });
      }
      await redis.set(rlKey, String(attempts + 1), { ex: 300 }); // 5 min TTL
    }

    // Find valid challenge
    const [challenge] = await db.select().from(schema.twoFactorChallenges)
      .where(
        and(
          eq(schema.twoFactorChallenges.challengeToken, challengeToken),
          gt(schema.twoFactorChallenges.expiresAt, new Date())
        )
      ).limit(1);

    if (!challenge) {
      return NextResponse.json({ error: "Invalid or expired challenge. Please log in again." }, { status: 401 });
    }

    // Get user
    const [user] = await db.select().from(schema.users)
      .where(eq(schema.users.id, challenge.userId)).limit(1);

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "2FA not configured for this account" }, { status: 400 });
    }

    // Verify TOTP code
    let valid = verifyTotpCode(user.totpSecret, code);

    // If TOTP fails, try recovery code
    if (!valid && user.recoveryCodes) {
      const hashedCodes: string[] = JSON.parse(user.recoveryCodes);
      const result = await verifyRecoveryCode(code, hashedCodes);
      valid = result.valid;

      // If recovery code used, update the remaining codes
      if (result.valid) {
        await db.update(schema.users)
          .set({ recoveryCodes: JSON.stringify(result.remainingCodes) })
          .where(eq(schema.users.id, user.id));
      }
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Delete the challenge (single-use)
    await db.delete(schema.twoFactorChallenges)
      .where(eq(schema.twoFactorChallenges.id, challenge.id));

    // Create full session (same as login flow)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(schema.sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    res.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      expires: expiresAt,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err: any) {
    console.error("2FA challenge error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
