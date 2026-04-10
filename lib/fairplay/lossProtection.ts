/**
 * Fair Play & Loss Protection System
 * Protects players from excessive losses with cooldowns and limits.
 * Responsible gaming system for real-money gameplay.
 */

import { getRedis } from "../redis";

// ── Loss State ───────────────────────────────────────────────────────────────

export interface LossState {
  consecutiveLosses: number;
  dailyLosses: number;
  dailyLossAmount: number; // credits lost today
  cooldownUntil: number | null; // timestamp
  lastGameAt: number;
  fairPlayScore: number; // 0-100, starts at 100
}

const LOSS_KEY = (playerId: string) => `fairplay:${playerId}`;
const LOSS_TTL = 86400 * 7; // 7 days

async function getLossState(playerId: string): Promise<LossState> {
  const redis = getRedis();
  const defaultState: LossState = {
    consecutiveLosses: 0,
    dailyLosses: 0,
    dailyLossAmount: 0,
    cooldownUntil: null,
    lastGameAt: 0,
    fairPlayScore: 100,
  };

  if (!redis) return defaultState;

  try {
    const data = await redis.get(LOSS_KEY(playerId));
    if (!data) return defaultState;
    const state = data as LossState;

    // Reset daily losses if new day
    const now = new Date();
    const lastGame = new Date(state.lastGameAt);
    if (now.toDateString() !== lastGame.toDateString()) {
      state.dailyLosses = 0;
      state.dailyLossAmount = 0;
    }

    return state;
  } catch {
    return defaultState;
  }
}

async function saveLossState(
  playerId: string,
  state: LossState
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(LOSS_KEY(playerId), state, { ex: LOSS_TTL });
}

// ── Record Game Result ───────────────────────────────────────────────────────

export interface GameResult {
  playerId: string;
  won: boolean;
  lossAmount?: number; // credits lost (only if lost)
  entryFee: number;
}

export interface LossProtectionAction {
  type: "none" | "warning" | "suggest_break" | "force_cooldown" | "daily_limit";
  message: string | null;
  cooldownMinutes: number;
}

export async function recordGameResult(
  result: GameResult
): Promise<LossProtectionAction> {
  const state = await getLossState(result.playerId);
  state.lastGameAt = Date.now();

  if (result.won) {
    // Win resets consecutive losses
    state.consecutiveLosses = 0;
    await saveLossState(result.playerId, state);
    return { type: "none", message: null, cooldownMinutes: 0 };
  }

  // Loss
  state.consecutiveLosses += 1;
  state.dailyLosses += 1;
  state.dailyLossAmount += result.lossAmount || result.entryFee;

  // ── Consecutive Loss Rules ─────────────────────────────────────────────
  let action: LossProtectionAction = {
    type: "none",
    message: null,
    cooldownMinutes: 0,
  };

  if (state.consecutiveLosses >= 20) {
    // 20 losses → 24 hour cooldown
    state.cooldownUntil = Date.now() + 24 * 60 * 60_000;
    action = {
      type: "force_cooldown",
      message:
        "You've had a tough streak. Take a 24-hour break and come back refreshed.",
      cooldownMinutes: 1440,
    };
    state.fairPlayScore = Math.max(0, state.fairPlayScore - 5);
  } else if (state.consecutiveLosses >= 10) {
    // 10 losses → 1 hour cooldown
    state.cooldownUntil = Date.now() + 60 * 60_000;
    action = {
      type: "force_cooldown",
      message:
        "You've lost 10 games in a row. Taking a 1-hour break to reset.",
      cooldownMinutes: 60,
    };
    state.fairPlayScore = Math.max(0, state.fairPlayScore - 3);
  } else if (state.consecutiveLosses >= 7) {
    // 7 losses → 10 min cooldown
    state.cooldownUntil = Date.now() + 10 * 60_000;
    action = {
      type: "force_cooldown",
      message:
        "7 losses in a row. Mandatory 10-minute break for your protection.",
      cooldownMinutes: 10,
    };
    state.fairPlayScore = Math.max(0, state.fairPlayScore - 2);
  } else if (state.consecutiveLosses >= 5) {
    // 5 losses → suggest break
    action = {
      type: "suggest_break",
      message:
        "You've lost 5 in a row. Consider taking a short break — luck can change!",
      cooldownMinutes: 0,
    };
    state.fairPlayScore = Math.max(0, state.fairPlayScore - 1);
  } else if (state.consecutiveLosses >= 3) {
    // 3 losses → warning
    action = {
      type: "warning",
      message: "Tough luck! Remember, it's just a game. Play responsibly.",
      cooldownMinutes: 0,
    };
  }

  // ── Daily Loss Cap ─────────────────────────────────────────────────────
  // Daily limit = 5× average table entry fee
  const dailyLimit = Math.max(result.entryFee * 5, 500); // minimum 500 credits

  if (state.dailyLossAmount >= dailyLimit && result.entryFee > 0) {
    state.cooldownUntil = getEndOfDay();
    action = {
      type: "daily_limit",
      message: `You've reached your daily loss limit. Play free rooms or come back tomorrow.`,
      cooldownMinutes: Math.ceil((getEndOfDay() - Date.now()) / 60_000),
    };
    state.fairPlayScore = Math.max(0, state.fairPlayScore - 3);
  }

  await saveLossState(result.playerId, state);
  return action;
}

// ── Check if Player Can Play ─────────────────────────────────────────────────

export interface PlayEligibility {
  canPlay: boolean;
  canPlayPaid: boolean; // can play credit rooms
  cooldownRemaining: number; // minutes
  message: string | null;
  fairPlayScore: number;
}

export async function checkPlayEligibility(
  playerId: string,
  entryFee: number = 0
): Promise<PlayEligibility> {
  const state = await getLossState(playerId);

  // Check cooldown
  if (state.cooldownUntil && Date.now() < state.cooldownUntil) {
    const remaining = Math.ceil((state.cooldownUntil - Date.now()) / 60_000);
    return {
      canPlay: entryFee === 0, // can still play free rooms
      canPlayPaid: false,
      cooldownRemaining: remaining,
      message: `Cooldown active. ${remaining} minutes remaining. Free rooms are still available.`,
      fairPlayScore: state.fairPlayScore,
    };
  }

  // Check daily limit for paid rooms
  const dailyLimit = Math.max(entryFee * 5, 500);
  if (state.dailyLossAmount >= dailyLimit && entryFee > 0) {
    return {
      canPlay: true, // free rooms ok
      canPlayPaid: false,
      cooldownRemaining: 0,
      message: "Daily loss limit reached for paid rooms. Try free rooms!",
      fairPlayScore: state.fairPlayScore,
    };
  }

  return {
    canPlay: true,
    canPlayPaid: true,
    cooldownRemaining: 0,
    message: null,
    fairPlayScore: state.fairPlayScore,
  };
}

// ── Skill-Based Downranking ──────────────────────────────────────────────────

export async function shouldDownrank(playerId: string): Promise<boolean> {
  const state = await getLossState(playerId);
  // If fair play score drops below 50, suggest lower stakes
  return state.fairPlayScore < 50;
}

// ── Fraud + Loss Crossover Detection ─────────────────────────────────────────

export async function checkLossCrossover(
  playerId: string,
  opponentIds: string[]
): Promise<{ suspicious: boolean; details: string | null }> {
  // If player repeatedly loses to same opponents, flag it
  const redis = getRedis();
  if (!redis)
    return { suspicious: false, details: null };

  for (const oppId of opponentIds) {
    const pairKey =
      playerId < oppId ? `${playerId}:${oppId}` : `${oppId}:${playerId}`;
    const stats = (await redis.hgetall(`pair:${pairKey}`)) as Record<
      string,
      string
    > | null;
    if (!stats) continue;

    const matchCount = Number(stats.matchesTogether) || 0;
    const aWins = Number(stats.aWinsVsB) || 0;
    const bWins = Number(stats.bWinsVsA) || 0;

    // One player wins > 80% of matches with 5+ games
    if (matchCount >= 5) {
      const totalWins = aWins + bWins;
      if (totalWins > 0) {
        const maxWinRate = Math.max(aWins, bWins) / totalWins;
        if (maxWinRate > 0.8) {
          return {
            suspicious: true,
            details: `Player has ${Math.round(maxWinRate * 100)}% loss rate against opponent in ${matchCount} matches`,
          };
        }
      }
    }
  }

  return { suspicious: false, details: null };
}

// ── Fair Play Score ──────────────────────────────────────────────────────────

export async function getFairPlayScore(playerId: string): Promise<number> {
  const state = await getLossState(playerId);
  return state.fairPlayScore;
}

export async function adjustFairPlayScore(
  playerId: string,
  delta: number
): Promise<number> {
  const state = await getLossState(playerId);
  state.fairPlayScore = Math.max(0, Math.min(100, state.fairPlayScore + delta));
  await saveLossState(playerId, state);
  return state.fairPlayScore;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEndOfDay(): number {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
}
