/**
 * Turn Timer System
 *
 * Normal turn: 60 seconds
 * Responding to action (JSN, pay debt): 30 seconds
 * Time bank: 90 seconds per player per game (depletes after base timer)
 * AFK: 2 missed turns in a row → mark as disconnected
 *
 * Timer state is stored on the room object. The client polls and renders
 * the countdown. The server enforces auto-actions when time runs out.
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const TURN_TIME_MS = 60_000;        // 60 seconds for normal turn
export const RESPONSE_TIME_MS = 30_000;     // 30 seconds for responding to actions
export const TIME_BANK_MS = 90_000;         // 90 seconds time bank per player per game
export const WARNING_MS = 5_000;            // warning at 5 seconds remaining
export const AFK_MISS_LIMIT = 2;            // 2 missed turns → AFK

// ── Initialize timer state for a room ────────────────────────────────────────

export function initTimerState(playerIds) {
  const timeBanks = {};
  const missedTurns = {};
  for (const pid of playerIds) {
    timeBanks[pid] = TIME_BANK_MS;
    missedTurns[pid] = 0;
  }
  return {
    turnStartedAt: Date.now(),
    timeLimit: TURN_TIME_MS,
    timeBanks,
    missedTurns,
    isResponsePhase: false,
  };
}

// ── Start a new turn timer ───────────────────────────────────────────────────

export function startTurnTimer(room, isResponse = false) {
  if (!room._timer) {
    room._timer = initTimerState(room.players.map(p => p.id));
  }
  room._timer.turnStartedAt = Date.now();
  room._timer.timeLimit = isResponse ? RESPONSE_TIME_MS : TURN_TIME_MS;
  room._timer.isResponsePhase = isResponse;
}

// ── Get remaining time for current turn ──────────────────────────────────────

export function getRemainingTime(room) {
  if (!room._timer) return { remainingMs: TURN_TIME_MS, usingBank: false, bankRemainingMs: TIME_BANK_MS, warning: false };

  const elapsed = Date.now() - room._timer.turnStartedAt;
  const baseRemaining = room._timer.timeLimit - elapsed;
  const currentPlayerId = room.players[room.turnIndex]?.id;

  if (baseRemaining > 0) {
    return {
      remainingMs: baseRemaining,
      usingBank: false,
      bankRemainingMs: room._timer.timeBanks[currentPlayerId] || 0,
      warning: baseRemaining <= WARNING_MS,
    };
  }

  // Base timer expired — dipping into time bank
  const bankUsed = Math.abs(baseRemaining);
  const bankRemaining = (room._timer.timeBanks[currentPlayerId] || 0) - bankUsed;

  if (bankRemaining > 0) {
    return {
      remainingMs: bankRemaining,
      usingBank: true,
      bankRemainingMs: bankRemaining,
      warning: bankRemaining <= WARNING_MS,
    };
  }

  // Both timers expired
  return {
    remainingMs: 0,
    usingBank: true,
    bankRemainingMs: 0,
    warning: true,
    expired: true,
  };
}

// ── Check if turn has timed out (called before processing moves) ─────────────

export function hasTimedOut(room) {
  const time = getRemainingTime(room);
  return time.expired === true;
}

// ── Record that player acted (reset missed turns, deduct bank if used) ───────

export function recordPlayerAction(room, playerId) {
  if (!room._timer) return;

  const elapsed = Date.now() - room._timer.turnStartedAt;
  const overBase = elapsed - room._timer.timeLimit;

  // If they went over the base timer, deduct from their bank
  if (overBase > 0 && room._timer.timeBanks[playerId] !== undefined) {
    room._timer.timeBanks[playerId] = Math.max(0, room._timer.timeBanks[playerId] - overBase);
  }

  // Reset missed turns — they're active
  if (room._timer.missedTurns[playerId] !== undefined) {
    room._timer.missedTurns[playerId] = 0;
  }
}

// ── Handle timeout — auto-action when timer expires ──────────────────────────

export function handleTimeout(room) {
  if (!room._timer) return null;

  const currentPlayer = room.players[room.turnIndex];
  if (!currentPlayer) return null;
  const pid = currentPlayer.id;

  // Increment missed turns
  if (room._timer.missedTurns[pid] !== undefined) {
    room._timer.missedTurns[pid] += 1;
  }

  // Check AFK
  const isAfk = (room._timer.missedTurns[pid] || 0) >= AFK_MISS_LIMIT;

  if (room._timer.isResponsePhase) {
    // Timed out during response → auto-accept (don't play Just Say No)
    return {
      action: "auto_accept",
      playerId: pid,
      isAfk,
      reason: "Response timer expired",
    };
  }

  // Timed out during normal turn → auto end turn (play nothing)
  return {
    action: "auto_end_turn",
    playerId: pid,
    isAfk,
    reason: "Turn timer expired",
  };
}

// ── Get timer state for client (sanitized — no internals) ────────────────────

export function getTimerStateForClient(room, playerId) {
  const time = getRemainingTime(room);
  const currentPlayer = room.players[room.turnIndex];

  return {
    remainingMs: Math.max(0, time.remainingMs),
    totalMs: room._timer?.timeLimit || TURN_TIME_MS,
    usingBank: time.usingBank,
    bankRemainingMs: Math.max(0, time.bankRemainingMs),
    warning: time.warning,
    isMyTurn: currentPlayer?.id === playerId,
    isResponsePhase: room._timer?.isResponsePhase || false,
    // Don't expose other players' bank time or missed turns
  };
}
