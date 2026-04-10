/**
 * Audit Logging System
 * Structured logs for every important action.
 * Stored in Redis (recent) + DB (permanent).
 */

import { getRedis } from "../redis";

// ── Audit Entry ──────────────────────────────────────────────────────────────

export interface AuditEntry {
  userId?: string;
  action: string;
  resource?: string; // game_room, credit, wallet, etc.
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  deviceId?: string;
  success: boolean;
  timestamp: number;
}

// ── Log Audit Event ──────────────────────────────────────────────────────────

const AUDIT_TTL = 86400 * 30; // 30 days in Redis
const AUDIT_MAX = 10000; // max entries in Redis list

export async function logAudit(entry: Omit<AuditEntry, "timestamp">): Promise<void> {
  const fullEntry: AuditEntry = {
    ...entry,
    timestamp: Date.now(),
  };

  // Always log to console (structured)
  const level = entry.success ? "info" : "warn";
  console[level](
    `[AUDIT] ${entry.action} | user=${entry.userId || "anon"} | resource=${entry.resource || "-"}:${entry.resourceId || "-"} | success=${entry.success}`,
    entry.details ? JSON.stringify(entry.details) : ""
  );

  // Store in Redis for quick access
  const redis = getRedis();
  if (!redis) return;

  try {
    const pipe = redis.pipeline();

    // Global audit log
    pipe.rpush("audit:global", JSON.stringify(fullEntry));
    pipe.ltrim("audit:global", -AUDIT_MAX, -1);
    pipe.expire("audit:global", AUDIT_TTL);

    // Per-user audit log
    if (entry.userId) {
      pipe.rpush(`audit:user:${entry.userId}`, JSON.stringify(fullEntry));
      pipe.ltrim(`audit:user:${entry.userId}`, -500, -1);
      pipe.expire(`audit:user:${entry.userId}`, AUDIT_TTL);
    }

    // Suspicious actions get their own list
    if (!entry.success || entry.action.startsWith("fraud:")) {
      pipe.rpush("audit:suspicious", JSON.stringify(fullEntry));
      pipe.ltrim("audit:suspicious", -AUDIT_MAX, -1);
      pipe.expire("audit:suspicious", AUDIT_TTL);
    }

    await pipe.exec();
  } catch (err) {
    console.error("[Audit] Failed to write to Redis:", err);
  }
}

// ── Convenience Loggers ──────────────────────────────────────────────────────

export async function logGameAction(
  userId: string,
  roomId: string,
  action: string,
  details?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  await logAudit({
    userId,
    action: `game:${action}`,
    resource: "game_room",
    resourceId: roomId,
    details,
    ip,
    success: true,
  });
}

export async function logSecurityEvent(
  action: string,
  details: Record<string, unknown>,
  ip?: string,
  userId?: string
): Promise<void> {
  await logAudit({
    userId,
    action: `security:${action}`,
    details,
    ip,
    success: false,
  });
}

export async function logFraudEvent(
  userId: string,
  signalType: string,
  details: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action: `fraud:${signalType}`,
    details,
    success: false,
  });
}

export async function logTransaction(
  userId: string,
  type: string,
  amount: number,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action: `tx:${type}`,
    resource: "credit",
    details: { amount, ...details },
    success: true,
  });
}
