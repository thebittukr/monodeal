/**
 * Risk Scoring System
 * Maintains a dynamic risk score per player based on fraud signals.
 * Score determines enforcement level.
 */

import { Redis } from "@upstash/redis";
import type { FraudSignal } from "./behaviorDetection";

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

// ── Risk Levels ──────────────────────────────────────────────────────────────

export type RiskLevel = "normal" | "monitor" | "restrict" | "block";

export interface RiskProfile {
  score: number;
  level: RiskLevel;
  signals: string[]; // recent signal types
  lastUpdated: number;
}

const RISK_THRESHOLDS: Record<RiskLevel, number> = {
  normal: 0,
  monitor: 4,
  restrict: 7,
  block: 10,
};

function scoreToLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.block) return "block";
  if (score >= RISK_THRESHOLDS.restrict) return "restrict";
  if (score >= RISK_THRESHOLDS.monitor) return "monitor";
  return "normal";
}

// ── Get Risk Profile ─────────────────────────────────────────────────────────

const RISK_KEY = (playerId: string) => `risk:${playerId}`;
const RISK_TTL = 86400 * 30; // 30 days

export async function getRiskProfile(playerId: string): Promise<RiskProfile> {
  const redis = getRedis();
  const defaultProfile: RiskProfile = {
    score: 0,
    level: "normal",
    signals: [],
    lastUpdated: Date.now(),
  };

  if (!redis) return defaultProfile;

  try {
    const data = await redis.get(RISK_KEY(playerId));
    if (!data) return defaultProfile;
    return data as RiskProfile;
  } catch {
    return defaultProfile;
  }
}

// ── Update Risk Profile ──────────────────────────────────────────────────────

export async function applyFraudSignals(
  playerId: string,
  signals: FraudSignal[]
): Promise<RiskProfile> {
  const redis = getRedis();
  const profile = await getRiskProfile(playerId);

  // Add risk from new signals
  for (const signal of signals) {
    profile.score += signal.riskImpact;
    if (!profile.signals.includes(signal.type)) {
      profile.signals.push(signal.type);
    }
  }

  // Cap at 20
  profile.score = Math.min(profile.score, 20);
  profile.level = scoreToLevel(profile.score);
  profile.lastUpdated = Date.now();

  // Keep only last 10 signal types
  if (profile.signals.length > 10) {
    profile.signals = profile.signals.slice(-10);
  }

  if (redis) {
    try {
      await redis.set(RISK_KEY(playerId), profile, { ex: RISK_TTL });
    } catch (err) {
      console.error("[RiskScoring] Failed to save profile:", err);
    }
  }

  return profile;
}

// ── Natural Decay (call periodically or on game start) ───────────────────────

export async function decayRiskScore(playerId: string): Promise<RiskProfile> {
  const profile = await getRiskProfile(playerId);
  const redis = getRedis();

  const hoursSinceUpdate = (Date.now() - profile.lastUpdated) / 3_600_000;

  // Decay 1 point per 12 hours of clean play
  if (hoursSinceUpdate >= 12 && profile.score > 0) {
    const decayAmount = Math.floor(hoursSinceUpdate / 12);
    profile.score = Math.max(0, profile.score - decayAmount);
    profile.level = scoreToLevel(profile.score);
    profile.lastUpdated = Date.now();

    if (redis) {
      await redis.set(RISK_KEY(playerId), profile, { ex: RISK_TTL });
    }
  }

  return profile;
}

// ── Enforcement Decisions ────────────────────────────────────────────────────

export interface Enforcement {
  canPlay: boolean;
  canCreateRoom: boolean;
  canWithdraw: boolean;
  maxStake: number | null; // null = no limit
  warning: string | null;
}

export function getEnforcement(profile: RiskProfile): Enforcement {
  switch (profile.level) {
    case "normal":
      return {
        canPlay: true,
        canCreateRoom: true,
        canWithdraw: true,
        maxStake: null,
        warning: null,
      };

    case "monitor":
      return {
        canPlay: true,
        canCreateRoom: true,
        canWithdraw: true,
        maxStake: null,
        warning:
          "Your account is under review. Please play fairly.",
      };

    case "restrict":
      return {
        canPlay: true,
        canCreateRoom: false, // can join but not create
        canWithdraw: false, // withdrawals paused
        maxStake: 1000, // limited to low stakes
        warning:
          "Your account has been restricted due to suspicious activity. Contact support.",
      };

    case "block":
      return {
        canPlay: false,
        canCreateRoom: false,
        canWithdraw: false,
        maxStake: 0,
        warning:
          "Your account has been suspended. Contact support to appeal.",
      };
  }
}

// ── Quick Check (for API middleware) ──────────────────────────────────────────

export async function quickRiskCheck(
  playerId: string
): Promise<{ allowed: boolean; warning: string | null }> {
  const profile = await getRiskProfile(playerId);
  const enforcement = getEnforcement(profile);
  return {
    allowed: enforcement.canPlay,
    warning: enforcement.warning,
  };
}
