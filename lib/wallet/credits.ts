/**
 * Credits Service
 * Manages in-game currency: balance, lock/unlock, debit, credit.
 * 1 USDT = 100 credits
 */

import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { logTransaction } from "@/lib/security/audit";

export const CREDITS_PER_USDT = 100;

// ── Get Balance ──────────────────────────────────────────────────────────────

export interface CreditBalance {
  available: number; // can spend
  locked: number; // in active games
  total: number; // available + locked
  lifetimeDeposited: number;
  lifetimeWithdrawn: number;
  lifetimeWon: number;
  lifetimeLost: number;
  lifetimeRake: number;
}

export async function getBalance(userId: string): Promise<CreditBalance> {
  const rows = await db
    .select()
    .from(schema.credits)
    .where(eq(schema.credits.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    // Create credit account if doesn't exist
    await db.insert(schema.credits).values({ userId }).onConflictDoNothing();
    return {
      available: 0,
      locked: 0,
      total: 0,
      lifetimeDeposited: 0,
      lifetimeWithdrawn: 0,
      lifetimeWon: 0,
      lifetimeLost: 0,
      lifetimeRake: 0,
    };
  }

  const c = rows[0];
  return {
    available: c.balance,
    locked: c.lockedBalance,
    total: c.balance + c.lockedBalance,
    lifetimeDeposited: c.lifetimeDeposited,
    lifetimeWithdrawn: c.lifetimeWithdrawn,
    lifetimeWon: c.lifetimeWon,
    lifetimeLost: c.lifetimeLost,
    lifetimeRake: c.lifetimeRake,
  };
}

// ── Credit (add credits) ─────────────────────────────────────────────────────

export async function creditUser(
  userId: string,
  amount: number,
  type: "deposit" | "game_win" | "refund" | "bonus",
  referenceId?: string,
  txHash?: string
): Promise<{ newBalance: number }> {
  if (amount <= 0) throw new Error("Amount must be positive");

  // Atomic update
  const updated = await db
    .update(schema.credits)
    .set({
      balance: sql`${schema.credits.balance} + ${amount}`,
      ...(type === "deposit"
        ? {
            lifetimeDeposited: sql`${schema.credits.lifetimeDeposited} + ${amount}`,
          }
        : {}),
      ...(type === "game_win"
        ? { lifetimeWon: sql`${schema.credits.lifetimeWon} + ${amount}` }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.credits.userId, userId))
    .returning({ balance: schema.credits.balance });

  if (updated.length === 0) throw new Error("User credit account not found");

  const newBalance = updated[0].balance;

  // Record transaction
  await db.insert(schema.creditTransactions).values({
    userId,
    type,
    amount,
    balanceAfter: newBalance,
    referenceId,
    txHash,
    status: "confirmed",
  });

  await logTransaction(userId, type, amount, { referenceId, txHash });

  return { newBalance };
}

// ── Debit (remove credits) ───────────────────────────────────────────────────

export async function debitUser(
  userId: string,
  amount: number,
  type: "withdrawal" | "game_entry" | "rake" | "girlfriend_purchase",
  referenceId?: string
): Promise<{ newBalance: number }> {
  if (amount <= 0) throw new Error("Amount must be positive");

  // Atomic check-and-debit (prevents overdraft)
  const updated = await db
    .update(schema.credits)
    .set({
      balance: sql`${schema.credits.balance} - ${amount}`,
      ...(type === "withdrawal"
        ? {
            lifetimeWithdrawn: sql`${schema.credits.lifetimeWithdrawn} + ${amount}`,
          }
        : {}),
      ...(type === "game_entry"
        ? { lifetimeLost: sql`${schema.credits.lifetimeLost} + ${amount}` }
        : {}),
      ...(type === "rake"
        ? { lifetimeRake: sql`${schema.credits.lifetimeRake} + ${amount}` }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      sql`${schema.credits.userId} = ${userId} AND ${schema.credits.balance} >= ${amount}`
    )
    .returning({ balance: schema.credits.balance });

  if (updated.length === 0) {
    throw new Error("Insufficient credits");
  }

  const newBalance = updated[0].balance;

  await db.insert(schema.creditTransactions).values({
    userId,
    type,
    amount: -amount,
    balanceAfter: newBalance,
    referenceId,
    status: "confirmed",
  });

  await logTransaction(userId, type, -amount, { referenceId });

  return { newBalance };
}

// ── Lock Credits (entering a game) ───────────────────────────────────────────

export async function lockCredits(
  userId: string,
  amount: number,
  roomId: string
): Promise<void> {
  if (amount <= 0) return; // free room

  const updated = await db
    .update(schema.credits)
    .set({
      balance: sql`${schema.credits.balance} - ${amount}`,
      lockedBalance: sql`${schema.credits.lockedBalance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${schema.credits.userId} = ${userId} AND ${schema.credits.balance} >= ${amount}`
    )
    .returning();

  if (updated.length === 0) {
    throw new Error("Insufficient credits to enter game");
  }

  await db.insert(schema.creditTransactions).values({
    userId,
    type: "game_entry",
    amount: -amount,
    balanceAfter: updated[0].balance,
    referenceId: roomId,
    status: "confirmed",
  });
}

// ── Unlock Credits (game cancelled / refund) ─────────────────────────────────

export async function unlockCredits(
  userId: string,
  amount: number,
  roomId: string
): Promise<void> {
  if (amount <= 0) return;

  await db
    .update(schema.credits)
    .set({
      balance: sql`${schema.credits.balance} + ${amount}`,
      lockedBalance: sql`${schema.credits.lockedBalance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.credits.userId, userId));

  await db.insert(schema.creditTransactions).values({
    userId,
    type: "refund",
    amount,
    balanceAfter: 0, // will be updated on next read
    referenceId: roomId,
    status: "confirmed",
  });
}

// ── Settle Game (winner gets pot minus rake) ─────────────────────────────────

export async function settleGame(
  winnerId: string,
  loserIds: string[],
  entryFee: number,
  rakeAmount: number,
  winnerPayout: number,
  roomId: string
): Promise<void> {
  if (entryFee === 0) return; // free room

  // Release locked credits for all players
  const allPlayerIds = [winnerId, ...loserIds];
  for (const pid of allPlayerIds) {
    await db
      .update(schema.credits)
      .set({
        lockedBalance: sql`GREATEST(${schema.credits.lockedBalance} - ${entryFee}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(schema.credits.userId, pid));
  }

  // Credit winner
  await creditUser(winnerId, winnerPayout, "game_win", roomId);

  // Record rake (goes to platform)
  // Rake is tracked but doesn't go to any user — it's platform revenue
  await db.insert(schema.creditTransactions).values({
    userId: "PLATFORM",
    type: "rake",
    amount: rakeAmount,
    balanceAfter: 0,
    referenceId: roomId,
    status: "confirmed",
  });

  await logTransaction("PLATFORM", "rake", rakeAmount, { roomId, winnerId });
}

// ── Transaction History ──────────────────────────────────────────────────────

export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return db
    .select()
    .from(schema.creditTransactions)
    .where(eq(schema.creditTransactions.userId, userId))
    .orderBy(sql`${schema.creditTransactions.createdAt} DESC`)
    .limit(limit)
    .offset(offset);
}
