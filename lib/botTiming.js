/**
 * Human-like Bot Timing — Snappy Edition
 * Fast enough to keep gameplay flowing, slow enough to feel human.
 * Polling is every 2s — delays are 1.5-4s range for snappy play.
 */

const PERSONALITY_PROFILES = {
  aggressive: {
    playCard:     { min: 1200, max: 2500 },
    respond:      { min: 800,  max: 1800 },
    endTurn:      { min: 600,  max: 1200 },
    distractChance: 0.03,
  },
  cautious: {
    playCard:     { min: 2000, max: 3500 },
    respond:      { min: 1500, max: 2800 },
    endTurn:      { min: 1000, max: 2000 },
    distractChance: 0.06,
  },
  balanced: {
    playCard:     { min: 1500, max: 3000 },
    respond:      { min: 1200, max: 2200 },
    endTurn:      { min: 800,  max: 1500 },
    distractChance: 0.04,
  },
  strategic: {
    playCard:     { min: 2200, max: 4000 },
    respond:      { min: 1800, max: 3200 },
    endTurn:      { min: 1200, max: 2200 },
    distractChance: 0.03,
  },
  unpredictable: {
    playCard:     { min: 800,  max: 4000 },
    respond:      { min: 600,  max: 3000 },
    endTurn:      { min: 500,  max: 2500 },
    distractChance: 0.08,
  },
};

export function getBotDelay(personality = 'balanced', actionType = 'playCard') {
  const profile = PERSONALITY_PROFILES[personality] || PERSONALITY_PROFILES.balanced;
  const timing = profile[actionType] || profile.playCard;

  // Gaussian-ish random (bell curve — most values near center)
  const u1 = Math.random(), u2 = Math.random(), u3 = Math.random();
  const avg = (u1 + u2 + u3) / 3;
  const base = timing.min + avg * (timing.max - timing.min);

  // Occasional distraction (+1-2 extra seconds — rare)
  const distracted = Math.random() < profile.distractChance;
  const distractDelay = distracted ? 1000 + Math.random() * 1500 : 0;

  return Math.max(800, Math.round(base + distractDelay));
}

export function getBotCardPlayDelay(personality = 'balanced', cardNumber = 1) {
  const base = getBotDelay(personality, 'playCard');
  // 2nd and 3rd cards faster (already decided)
  const multiplier = cardNumber === 1 ? 1.0 : cardNumber === 2 ? 0.55 : 0.35;
  return Math.max(600, Math.round(base * multiplier));
}

export function formatDelay(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
