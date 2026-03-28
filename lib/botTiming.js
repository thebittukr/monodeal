/**
 * Human-like Bot Timing
 * Minimum delays: 3-5 seconds so bots visibly "think"
 * Polling is every 2s — delays must be > 2s to feel real
 */

const PERSONALITY_PROFILES = {
  aggressive: {
    playCard:     { min: 3000, max: 5000 },
    respond:      { min: 2500, max: 4500 },
    endTurn:      { min: 2000, max: 3500 },
    distractChance: 0.05,
  },
  cautious: {
    playCard:     { min: 4000, max: 7000 },
    respond:      { min: 3500, max: 6000 },
    endTurn:      { min: 2500, max: 4000 },
    distractChance: 0.10,
  },
  balanced: {
    playCard:     { min: 3500, max: 6000 },
    respond:      { min: 3000, max: 5000 },
    endTurn:      { min: 2000, max: 3500 },
    distractChance: 0.07,
  },
  strategic: {
    playCard:     { min: 5000, max: 8000 },
    respond:      { min: 4000, max: 7000 },
    endTurn:      { min: 3000, max: 5000 },
    distractChance: 0.04,
  },
  unpredictable: {
    playCard:     { min: 2500, max: 8000 },
    respond:      { min: 2000, max: 7000 },
    endTurn:      { min: 1500, max: 5000 },
    distractChance: 0.12,
  },
};

export function getBotDelay(personality = 'balanced', actionType = 'playCard') {
  const profile = PERSONALITY_PROFILES[personality] || PERSONALITY_PROFILES.balanced;
  const timing = profile[actionType] || profile.playCard;

  // Gaussian-ish random (bell curve — most values near center)
  const u1 = Math.random(), u2 = Math.random(), u3 = Math.random();
  const avg = (u1 + u2 + u3) / 3;
  const base = timing.min + avg * (timing.max - timing.min);

  // Occasional distraction (+2-4 extra seconds)
  const distracted = Math.random() < profile.distractChance;
  const distractDelay = distracted ? 2000 + Math.random() * 2000 : 0;

  return Math.max(2500, Math.round(base + distractDelay));
}

export function getBotCardPlayDelay(personality = 'balanced', cardNumber = 1) {
  const base = getBotDelay(personality, 'playCard');
  // 2nd and 3rd cards faster (already decided) but still min 2s
  const multiplier = cardNumber === 1 ? 1.0 : cardNumber === 2 ? 0.65 : 0.45;
  return Math.max(2500, Math.round(base * multiplier));
}

export function formatDelay(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
