/**
 * Check Deposit — polls custodial wallet for incoming USDT/USDC
 * POST (authenticated) → { found, creditsAdded?, token?, amount? }
 *
 * Idempotent: uses Redis lock to prevent double-crediting.
 * Rate limited: max 1 call per 10 seconds per user.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUserWallet, checkDeposits, processDeposit } from "@/lib/wallet/polygon";
import { getRedis } from "@/lib/redis";
import { randomBytes } from "crypto";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit: 1 check per 10 seconds per user
    const redis = getRedis();
    if (redis) {
      const rlKey = `deposit_rl:${user.id}`;
      const recent = await redis.get(rlKey);
      if (recent) {
        return NextResponse.json({ found: false, message: "Please wait before checking again" });
      }
      await redis.set(rlKey, "1", { ex: 10 });
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

    // Idempotency: prevent double-crediting the same balance
    // Lock by user + amount + token — if this exact deposit was already processed, skip
    const depositKey = `deposit_lock:${user.id}:${result.token}:${result.amount}`;
    if (redis) {
      const alreadyProcessed = await redis.get(depositKey);
      if (alreadyProcessed) {
        return NextResponse.json({ found: false, message: "Deposit already credited" });
      }
      // Lock for 1 hour — prevents re-crediting same balance
      await redis.set(depositKey, "1", { ex: 3600 });
    }

    // Deposit found — credit the user
    const txHash = `deposit_${Date.now()}_${randomBytes(8).toString("hex")}`;
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
    return NextResponse.json({ error: "Failed to check deposit" }, { status: 500 });
  }
}
