/**
 * Reset Password with Recovery Code — For users with 2FA who forgot their password
 * POST { email, recoveryCode, newPassword }
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { verifyRecoveryCode } from "@/lib/auth/totp";

export async function POST(req: Request) {
  try {
    const { email, recoveryCode, newPassword } = await req.json();

    if (!email || !recoveryCode || !newPassword) {
      return NextResponse.json({ error: "Email, recovery code, and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find user
    const [user] = await db.select().from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);

    if (!user) {
      return NextResponse.json({ error: "Invalid email or recovery code" }, { status: 400 });
    }

    // Must have 2FA enabled with recovery codes
    if (!user.totpEnabled || !user.recoveryCodes) {
      return NextResponse.json({ error: "Recovery codes are not available for this account" }, { status: 400 });
    }

    // Verify recovery code
    const hashedCodes: string[] = JSON.parse(user.recoveryCodes);
    const result = await verifyRecoveryCode(recoveryCode, hashedCodes);

    if (!result.valid) {
      return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password + consume recovery code
    await db.update(schema.users)
      .set({
        passwordHash,
        recoveryCodes: JSON.stringify(result.remainingCodes),
      })
      .where(eq(schema.users.id, user.id));

    // Invalidate all sessions
    await db.delete(schema.sessions)
      .where(eq(schema.sessions.userId, user.id));

    return NextResponse.json({
      ok: true,
      message: "Password reset successfully. Please log in with your new password.",
      remainingRecoveryCodes: result.remainingCodes.length,
    });
  } catch (err: any) {
    console.error("Recovery reset error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
