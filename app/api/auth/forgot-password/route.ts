/**
 * Forgot Password — Send reset email
 * POST { email }
 * Always returns success (don't leak whether email exists)
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { getRedis } from "@/lib/redis";

function getBaseUrl(req: Request): string {
  const headers = new Headers(req.headers);
  const forwardedHost = headers.get("x-forwarded-host") || headers.get("host");
  const forwardedProto = headers.get("x-forwarded-proto") || "https";
  return process.env.NEXT_PUBLIC_APP_URL || `${forwardedProto}://${forwardedHost}`;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Rate limit: max 3 reset emails per email per 15 minutes
    const redis = getRedis();
    if (redis) {
      const rlKey = `reset_rl:${email.toLowerCase().trim()}`;
      const count = parseInt(await redis.get(rlKey) || "0");
      if (count >= 3) {
        // Still return success to prevent email enumeration
        return NextResponse.json({ ok: true, message: "If an account exists with that email, we've sent a password reset link." });
      }
      await redis.set(rlKey, String(count + 1), { ex: 900 }); // 15 min
    }

    const baseUrl = getBaseUrl(req);

    // Find user — but always return success to prevent email enumeration
    const [user] = await db.select().from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);

    if (user) {
      // Generate reset token (1 hour expiry)
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(schema.passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    // Always return success
    return NextResponse.json({
      ok: true,
      message: "If an account exists with that email, we've sent a password reset link.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
