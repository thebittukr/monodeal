/**
 * 2FA Disable — Verify TOTP code then turn off 2FA
 * POST { code } (authenticated)
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { verifyTotpCode, verifyRecoveryCode } from "@/lib/auth/totp";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Verification code required" }, { status: 400 });
    }

    // Fetch user with TOTP data
    const [dbUser] = await db.select().from(schema.users)
      .where(eq(schema.users.id, user.id)).limit(1);

    if (!dbUser?.totpEnabled || !dbUser.totpSecret) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }

    // Try TOTP code first
    let valid = verifyTotpCode(dbUser.totpSecret, code);

    // If TOTP fails, try recovery code
    if (!valid && dbUser.recoveryCodes) {
      const hashedCodes: string[] = JSON.parse(dbUser.recoveryCodes);
      const result = await verifyRecoveryCode(code, hashedCodes);
      valid = result.valid;
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Disable 2FA
    await db.update(schema.users)
      .set({
        totpSecret: null,
        totpEnabled: false,
        recoveryCodes: null,
      })
      .where(eq(schema.users.id, user.id));

    return NextResponse.json({ ok: true, message: "Two-factor authentication disabled." });
  } catch (err: any) {
    console.error("2FA disable error:", err);
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
  }
}
