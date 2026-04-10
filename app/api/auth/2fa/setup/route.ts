/**
 * 2FA Setup — Generate TOTP secret + QR code
 * POST (authenticated) → { secret, qrDataUrl }
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { generateTotpSecret } from "@/lib/auth/totp";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { secret, qrDataUrl } = await generateTotpSecret(user.email);

    // Return secret and QR — NOT stored in DB yet (stored after verify-setup)
    return NextResponse.json({ secret, qrDataUrl });
  } catch (err: any) {
    console.error("2FA setup error:", err);
    return NextResponse.json({ error: "Failed to generate 2FA secret" }, { status: 500 });
  }
}
