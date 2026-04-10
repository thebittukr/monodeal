/**
 * Check Deposit — polls custodial wallet for incoming USDT/USDC
 * POST (authenticated) → { found, creditsAdded?, token?, amount? }
 *
 * Client polls this every ~15 seconds while user is on the deposit page.
 * If funds are detected, they're automatically credited to the user's account.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUserWallet, checkDeposits, processDeposit } from "@/lib/wallet/polygon";
import { randomBytes } from "crypto";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get custodial wallet
    const wallet = await getUserWallet(user.id);
    if (!wallet.custodial) {
      return NextResponse.json({ found: false, message: "No custodial wallet" });
    }

    // Check for incoming deposits
    const result = await checkDeposits(user.id, wallet.custodial.address);

    if (!result || !result.found || result.amount <= 0) {
      return NextResponse.json({ found: false });
    }

    // Deposit found — credit the user
    const txHash = `deposit_${randomBytes(16).toString("hex")}`;
    const { creditsAdded } = await processDeposit(
      user.id,
      result.amount,
      result.token,
      txHash
    );

    return NextResponse.json({
      found: true,
      creditsAdded,
      token: result.token,
      amount: result.amount,
      amountUSD: result.amount,
    });
  } catch (err: any) {
    console.error("[Check Deposit] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to check deposit" }, { status: 500 });
  }
}
