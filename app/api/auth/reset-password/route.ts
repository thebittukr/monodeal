/**
 * Reset Password — Use token from email to set new password
 * POST { token, newPassword }
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find valid, unused token
    const [resetToken] = await db.select().from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.token, token),
          gt(schema.passwordResetTokens.expiresAt, new Date()),
          isNull(schema.passwordResetTokens.usedAt)
        )
      ).limit(1);

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link. Please request a new one." }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, resetToken.userId));

    // Mark token as used
    await db.update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.passwordResetTokens.id, resetToken.id));

    // Invalidate all sessions (force re-login)
    await db.delete(schema.sessions)
      .where(eq(schema.sessions.userId, resetToken.userId));

    return NextResponse.json({
      ok: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
