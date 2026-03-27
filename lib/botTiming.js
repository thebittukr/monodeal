/**
 * Human-like Bot Timing
 *
 * Makes bots feel real by adding variable delays based on:
 * - Personality (aggressive = faster, strategic = slower)
 * - Action type (banking money = quick, targeting someone = slow)
 * - Random variance (no two moves feel the same)
 * - Occasional "distraction" pauses
 */

// ── Personality Speed Profiles (in milliseconds) ─────────────────────────────

const PERSONALITY_PROFILES = {
  aggressive: {
    playCard:     { min: 1500, max: 3500 },  // fast decisions
    respond:      { min: 2000, max: 4000 },
    targeting:    { min: 2500, max: 5000 },
    endTurn:      { min: 800,  max: 2000 },
    bankMoney:    { min: 1000, max: 2500 },
    distractChance: 0.05,  // rarely distracted
  },
  cautious: {
    playCard:     { min: 3000, max: 6000 },  // thinks carefully
    respond:      { min: 3500, max: 7000 },
    targeting:    { min: 4000, max: 8000 },
    endTurn:      { min: 1500, max: 3000 },
    bankMoney:    { min: 2000, max: 4000 },
    distractChance: 0.12,  // sometimes hesitates
  },
  balanced: {
    playCard:     { min: 2000, max: 5000 },
    respond:      { min: 2500, max: 5500 },
    targeting:    { min: 3000, max: 6500 },
    endTurn:      { min: 1000, max: 2500 },
    bankMoney:    { min: 1500, max: 3000 },
    distractChance: 0.08,
  },
  strategic: {
    playCard:     { min: 3500, max: 7000 },  // deliberate
    respond:      { min: 4000, max: 8000 },
    targeting:    { min: 5000, max: 10000 }, // really thinks about who to target
    endTurn:      { min: 1500, max: 3500 },
    bankMoney:    { min: 2000, max: 4000 },
    distractChance: 0.03,  // very focused
  },
  unpredictable: {
    playCard:     { min: 1000, max: 8000 },  // wildly variable
    respond:      { min: 1500, max: 9000 },
    targeting:    { min: 2000, max: 10000 },
    endTurn:      { min: 500,  max: 4000 },
    bankMoney:    { min: 800,  max: 5000 },
    distractChance: 0.15,  // often pauses randomly
  },
};

// ── Calculate delay for a bot action ─────────────────────────────────────────

/**
 * Get a human-like delay for a bot action.
 *
 * @param personality - Bot personality type
 * @param actionType - What the bot is doing
 * @returns Delay in milliseconds
 */
export function getBotDelay(personality = 'balanced', actionType = 'playCard') {
  const profile = PERSONALITY_PROFILES[personality] || PERSONALITY_PROFILES.balanced;
  const timing = profile[actionType] || profile.playCard;

  // Base delay with gaussian-like distribution (more natural than uniform random)
  const base = gaussianRandom(timing.min, timing.max);

  // Occasional distraction pause (3-5 extra seconds)
  const distracted = Math.random() < profile.distractChance;
  const distractDelay = distracted ? 3000 + Math.random() * 2000 : 0;

  // Small jitter (±200ms) to prevent perfectly timed patterns
  const jitter = (Math.random() - 0.5) * 400;

  return Math.max(800, Math.round(base + distractDelay + jitter));
}

/**
 * Get delay specifically for playing multiple cards in a turn.
 * Second and third cards are played faster (player already decided).
 */
export function getBotCardPlayDelay(personality = 'balanced', cardNumber = 1) {
  const base = getBotDelay(personality, 'playCard');

  // First card: full thinking time
  // Second card: 60% of base (already decided)
  // Third card: 40% of base (rapid fire)
  const multiplier = cardNumber === 1 ? 1.0 : cardNumber === 2 ? 0.6 : 0.4;

  return Math.max(600, Math.round(base * multiplier));
}

// ── Gaussian-like random (bell curve, more values near center) ───────────────

function gaussianRandom(min, max) {
  // Box-Muller transform approximation using multiple uniform randoms
  const u1 = Math.random();
  const u2 = Math.random();
  const u3 = Math.random();
  // Average of 3 randoms gives a rough bell curve (central limit theorem)
  const avg = (u1 + u2 + u3) / 3;
  return min + avg * (max - min);
}

// ── Utility: Format delay for logging ────────────────────────────────────────

export function formatDelay(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
