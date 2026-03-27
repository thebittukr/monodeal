/**
 * Rake System
 * Takes 15% from the pot in credits-mode games.
 * Free rooms have no rake.
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const RAKE_PERCENT = 15;
export const MIN_RAKE = 1; // minimum 1 credit rake (avoid 0 on tiny pots)

// ── Rake Calculation ─────────────────────────────────────────────────────────

export interface RakeResult {
  potTotal: number; // total pot (sum of all entry fees)
  rakeAmount: number; // platform takes this
  winnerPayout: number; // winner gets this
  entryFee: number; // per player
  playerCount: number;
}

/**
 * Calculate rake for a completed game.
 * Only applies to credits-mode games (entryFee > 0).
 */
export function calculateRake(
  entryFee: number,
  playerCount: number
): RakeResult {
  const potTotal = entryFee * playerCount;

  if (entryFee === 0) {
    // Free room — no rake
    return {
      potTotal: 0,
      rakeAmount: 0,
      winnerPayout: 0,
      entryFee: 0,
      playerCount,
    };
  }

  const rawRake = Math.floor((potTotal * RAKE_PERCENT) / 100);
  const rakeAmount = Math.max(rawRake, MIN_RAKE);
  const winnerPayout = potTotal - rakeAmount;

  return {
    potTotal,
    rakeAmount,
    winnerPayout,
    entryFee,
    playerCount,
  };
}

// ── Entry Fee Tiers ──────────────────────────────────────────────────────────

export const ENTRY_FEE_TIERS = [
  { label: "Free", fee: 0, description: "Play for fun" },
  { label: "Casual", fee: 100, description: "100 credits" },
  { label: "Standard", fee: 500, description: "500 credits" },
  { label: "High Roller", fee: 2000, description: "2,000 credits" },
  { label: "VIP", fee: 10000, description: "10,000 credits" },
];

/**
 * Validate entry fee is a valid tier.
 */
export function isValidEntryFee(fee: number): boolean {
  return ENTRY_FEE_TIERS.some((tier) => tier.fee === fee);
}

// ── Payout Distribution ──────────────────────────────────────────────────────

export interface PayoutDistribution {
  winnerId: string;
  winnerPayout: number;
  rakeAmount: number;
  losers: Array<{ playerId: string; lossAmount: number }>;
}

/**
 * Calculate payout distribution for a completed game.
 */
export function calculatePayouts(
  winnerId: string,
  playerIds: string[],
  entryFee: number
): PayoutDistribution {
  const rake = calculateRake(entryFee, playerIds.length);

  const losers = playerIds
    .filter((id) => id !== winnerId)
    .map((id) => ({ playerId: id, lossAmount: entryFee }));

  return {
    winnerId,
    winnerPayout: rake.winnerPayout,
    rakeAmount: rake.rakeAmount,
    losers,
  };
}
