/**
 * Withdrawal API — send credits as USDT/USDC to external wallet
 * POST { amount, toAddress, token?, totpCode? }
 *
 * Security:
 * - Auth required
 * - 2FA verification if user has TOTP enabled
 * - Minimum 500 credits (5 USDT)
 * - 24-hour cooldown for new accounts
 * - Atomic debit (prevents double-spend)
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { requestWithdrawal, MIN_WITHDRAWAL } from "@/lib/wallet/polygon";
import { verifyTotpCode, verifyRecoveryCode } from "@/lib/auth/totp";
import { ethers } from "ethers";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { amount, toAddress, token = "USDT", totpCode } = await req.json();

    // ── Validations ──────────────────────────────────────────────────
    if (!amount || !toAddress) {
      return NextResponse.json({ error: "Amount and destination address required" }, { status: 400 });
    }

    const creditsAmount = parseInt(amount);
    if (isNaN(creditsAmount) || creditsAmount < MIN_WITHDRAWAL) {
      return NextResponse.json({
        error: `Minimum withdrawal is ${MIN_WITHDRAWAL} credits (${MIN_WITHDRAWAL / 100} ${token})`,
      }, { status: 400 });
    }

    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!["USDT", "USDC"].includes(token)) {
      return NextResponse.json({ error: "Token must be USDT or USDC" }, { status: 400 });
    }

    // ── 2FA Check ────────────────────────────────────────────────────
    const [dbUser] = await db.select().from(schema.users)
      .where(eq(schema.users.id, user.id)).limit(1);

    if (dbUser?.totpEnabled) {
      if (!totpCode) {
        return NextResponse.json({
          error: "2FA code required for withdrawals",
          requires2FA: true,
        }, { status: 400 });
      }

      // Verify TOTP
      let valid = false;
      if (dbUser.totpSecret) {
        valid = verifyTotpCode(dbUser.totpSecret, totpCode);
      }

      // Try recovery code if TOTP fails
      if (!valid && dbUser.recoveryCodes) {
        const hashedCodes: string[] = JSON.parse(dbUser.recoveryCodes);
        const result = await verifyRecoveryCode(totpCode, hashedCodes);
        valid = result.valid;
        if (result.valid) {
          await db.update(schema.users)
            .set({ recoveryCodes: JSON.stringify(result.remainingCodes) })
            .where(eq(schema.users.id, user.id));
        }
      }

      if (!valid) {
        return NextResponse.json({ error: "Invalid 2FA code" }, { status: 400 });
      }
    }

    // ── Process Withdrawal ───────────────────────────────────────────
    const result = await requestWithdrawal(
      user.id,
      creditsAmount,
      toAddress,
      token as "USDT" | "USDC"
    );

    return NextResponse.json({
      ok: true,
      txHash: result.txHash,
      amountUSD: result.amountUSD,
      message: `Withdrew ${result.amountUSD} ${token} → ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
    });
  } catch (err: any) {
    console.error("[Withdrawal] Error:", err);
    // Don't leak internal errors — only show safe messages
    const safeMessages = ["Invalid address", "Minimum withdrawal", "Insufficient credits", "New accounts must wait", "2FA code required", "Invalid 2FA code", "Withdrawal system not configured"];
    const msg = safeMessages.find(m => err.message?.includes(m)) || "Withdrawal failed. Please try again.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
