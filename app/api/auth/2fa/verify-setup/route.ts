/**
 * 2FA Verify Setup — Confirm TOTP code, enable 2FA, return recovery codes
 * POST { secret, code } (authenticated)
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import {
  verifyTotpCodePlain,
  encryptTotpSecret,
  generateRecoveryCodes,
} from "@/lib/auth/totp";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { secret, code } = await req.json();

    if (!secret || !code) {
      return NextResponse.json({ error: "Secret and code are required" }, { status: 400 });
    }

    // Verify the code against the plain secret (not yet encrypted/stored)
    const valid = verifyTotpCodePlain(secret, code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid code. Make sure your authenticator is synced." }, { status: 400 });
    }

    // Encrypt secret for storage
    const encryptedSecret = encryptTotpSecret(secret);

    // Generate recovery codes
    const { plain: recoveryCodes, hashed: hashedCodes } = await generateRecoveryCodes();

    // Store in DB
    await db.update(schema.users)
      .set({
        totpSecret: encryptedSecret,
        totpEnabled: true,
        recoveryCodes: JSON.stringify(hashedCodes),
      })
      .where(eq(schema.users.id, user.id));

    return NextResponse.json({
      ok: true,
      recoveryCodes, // shown to user once
      message: "Two-factor authentication enabled. Save your recovery codes!",
    });
  } catch (err: any) {
    console.error("2FA verify-setup error:", err);
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 });
  }
}
