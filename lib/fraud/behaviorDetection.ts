/**
 * Behavior Detection Engine
 * Analyzes game events to detect collusion, bots, and abuse patterns.
 * Rule-based (no ML) — practical and scalable.
 */

import {
  getPairStats,
  getTargetingStats,
  getPlayersOnSameIp,
  getPlayersOnSameDevice,
} from "./eventTracker";

// ── Detection Result ─────────────────────────────────────────────────────────

export interface FraudSignal {
  type: string;
  severity: number; // 1-5
  riskImpact: number; // points added to risk score
  details: Record<string, unknown>;
}

// ── Rule: Same Device/IP in Same Room ────────────────────────────────────────

export async function detectSameNetwork(
  playerIds: string[],
  playerIps: Record<string, string>,
  playerDevices: Record<string, string>
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];

  // Check same IP
  const ipGroups: Record<string, string[]> = {};
  for (const pid of playerIds) {
    const ip = playerIps[pid] || "unknown";
    if (ip === "unknown") continue;
    if (!ipGroups[ip]) ipGroups[ip] = [];
    ipGroups[ip].push(pid);
  }
  for (const [ip, players] of Object.entries(ipGroups)) {
    if (players.length > 1) {
      signals.push({
        type: "same_ip_in_room",
        severity: 2,
        riskImpact: 2,
        details: { ip, players, count: players.length },
      });
    }
  }

  // Check same device
  const deviceGroups: Record<string, string[]> = {};
  for (const pid of playerIds) {
    const device = playerDevices[pid] || "unknown";
    if (device === "unknown") continue;
    if (!deviceGroups[device]) deviceGroups[device] = [];
    deviceGroups[device].push(pid);
  }
  for (const [device, players] of Object.entries(deviceGroups)) {
    if (players.length > 1) {
      signals.push({
        type: "same_device_in_room",
        severity: 3,
        riskImpact: 3,
        details: { device, players, count: players.length },
      });
    }
  }

  return signals;
}

// ── Rule: Repeated Matches Between Same Players ──────────────────────────────

export async function detectRepeatedMatches(
  playerIds: string[]
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const stats = await getPairStats(playerIds[i], playerIds[j]);
      const matchCount = stats.matchesTogether || 0;

      if (matchCount >= 10) {
        signals.push({
          type: "repeated_matches",
          severity: matchCount >= 20 ? 4 : 3,
          riskImpact: matchCount >= 20 ? 3 : 2,
          details: {
            playerA: playerIds[i],
            playerB: playerIds[j],
            matchCount,
          },
        });
      }
    }
  }

  return signals;
}

// ── Rule: Biased Targeting (one player targeted >70%) ────────────────────────

export async function detectBiasedTargeting(
  roomId: string,
  playerIds: string[]
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];

  for (const pid of playerIds) {
    const targeting = await getTargetingStats(roomId, pid);
    const totalActions = Object.values(targeting).reduce((a, b) => a + b, 0);

    if (totalActions < 3) continue; // not enough data

    for (const [target, count] of Object.entries(targeting)) {
      const ratio = count / totalActions;
      if (ratio > 0.7 && totalActions >= 5) {
        signals.push({
          type: "biased_targeting",
          severity: 3,
          riskImpact: 3,
          details: {
            attacker: pid,
            target,
            ratio: Math.round(ratio * 100),
            totalActions,
          },
        });
      }
    }
  }

  return signals;
}

// ── Rule: No Mutual Attacks (potential collusion) ────────────────────────────

export async function detectNoMutualAttacks(
  roomId: string,
  playerIds: string[]
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const aTargeting = await getTargetingStats(roomId, playerIds[i]);
      const bTargeting = await getTargetingStats(roomId, playerIds[j]);

      const aAttacksB = aTargeting[playerIds[j]] || 0;
      const bAttacksA = bTargeting[playerIds[i]] || 0;

      const totalAActions = Object.values(aTargeting).reduce(
        (a, b) => a + b,
        0
      );
      const totalBActions = Object.values(bTargeting).reduce(
        (a, b) => a + b,
        0
      );

      // Both players have made actions but never targeted each other
      if (
        totalAActions >= 3 &&
        totalBActions >= 3 &&
        aAttacksB === 0 &&
        bAttacksA === 0
      ) {
        signals.push({
          type: "no_mutual_attacks",
          severity: 3,
          riskImpact: 3,
          details: {
            playerA: playerIds[i],
            playerB: playerIds[j],
            aActions: totalAActions,
            bActions: totalBActions,
          },
        });
      }
    }
  }

  return signals;
}

// ── Rule: Group Targeting (3 players attacking 1) ────────────────────────────

export async function detectGroupTargeting(
  roomId: string,
  playerIds: string[]
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];
  if (playerIds.length < 3) return signals;

  // Count how many times each player is targeted by others
  const targetedBy: Record<string, Set<string>> = {};

  for (const pid of playerIds) {
    const targeting = await getTargetingStats(roomId, pid);
    for (const [target, count] of Object.entries(targeting)) {
      if (count >= 2) {
        if (!targetedBy[target]) targetedBy[target] = new Set();
        targetedBy[target].add(pid);
      }
    }
  }

  for (const [victim, attackers] of Object.entries(targetedBy)) {
    if (attackers.size >= playerIds.length - 1 && playerIds.length >= 3) {
      signals.push({
        type: "group_targeting",
        severity: 4,
        riskImpact: 4,
        details: {
          victim,
          attackers: Array.from(attackers),
          attackerCount: attackers.size,
        },
      });
    }
  }

  return signals;
}

// ── Rule: Bot-like Timing ────────────────────────────────────────────────────

export function detectBotTiming(moveTimes: number[]): FraudSignal[] {
  const signals: FraudSignal[] = [];
  if (moveTimes.length < 5) return signals;

  // Check for very fast moves (< 500ms consistently)
  const fastMoves = moveTimes.filter((t) => t < 500);
  if (fastMoves.length / moveTimes.length > 0.7) {
    signals.push({
      type: "bot_fast_timing",
      severity: 3,
      riskImpact: 2,
      details: {
        fastMoveRatio: Math.round(
          (fastMoves.length / moveTimes.length) * 100
        ),
        avgTime: Math.round(
          moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length
        ),
      },
    });
  }

  // Check for suspiciously consistent timing (low variance)
  const avg = moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length;
  const variance =
    moveTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) /
    moveTimes.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation < 0.1 = suspiciously consistent
  if (avg > 0 && stdDev / avg < 0.1 && moveTimes.length >= 10) {
    signals.push({
      type: "bot_consistent_timing",
      severity: 3,
      riskImpact: 2,
      details: {
        avgTime: Math.round(avg),
        stdDev: Math.round(stdDev),
        cv: Math.round((stdDev / avg) * 100) / 100,
      },
    });
  }

  return signals;
}

// ── Rule: Asset/Money Funneling ──────────────────────────────────────────────

export async function detectFunneling(
  playerIds: string[]
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const stats = await getPairStats(playerIds[i], playerIds[j]);
      const transfers = stats.assetTransfers || 0;

      if (transfers >= 5) {
        signals.push({
          type: "asset_funneling",
          severity: 4,
          riskImpact: 4,
          details: {
            playerA: playerIds[i],
            playerB: playerIds[j],
            transferCount: transfers,
          },
        });
      }
    }
  }

  return signals;
}

// ── Master Detection — Run All Rules ─────────────────────────────────────────

export interface DetectionContext {
  roomId: string;
  playerIds: string[];
  playerIps: Record<string, string>;
  playerDevices: Record<string, string>;
  moveTimes?: Record<string, number[]>; // per player
}

export async function runAllDetections(
  ctx: DetectionContext
): Promise<FraudSignal[]> {
  const allSignals: FraudSignal[] = [];

  const [network, repeated, biased, noMutual, groupTarget, funneling] =
    await Promise.all([
      detectSameNetwork(ctx.playerIds, ctx.playerIps, ctx.playerDevices),
      detectRepeatedMatches(ctx.playerIds),
      detectBiasedTargeting(ctx.roomId, ctx.playerIds),
      detectNoMutualAttacks(ctx.roomId, ctx.playerIds),
      detectGroupTargeting(ctx.roomId, ctx.playerIds),
      detectFunneling(ctx.playerIds),
    ]);

  allSignals.push(
    ...network,
    ...repeated,
    ...biased,
    ...noMutual,
    ...groupTarget,
    ...funneling
  );

  // Bot timing per player
  if (ctx.moveTimes) {
    for (const [, times] of Object.entries(ctx.moveTimes)) {
      allSignals.push(...detectBotTiming(times));
    }
  }

  return allSignals;
}
