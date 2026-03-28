/**
 * Human-like Bot Timing
 * Makes bots feel real with variable delays.
 * Tuned to feel natural but NOT painfully slow.
 * Target: 1-4 seconds per action (feels human, keeps game moving)
 */

const PERSONALITY_PROFILES = {
  aggressive: {
    playCard:     { min: 800,  max: 2000 },
    respond:      { min: 1000, max: 2500 },
    targeting:    { min: 1200, max: 2800 },
    endTurn:      { min: 500,  max: 1200 },
    bankMoney:    { min: 600,  max: 1500 },
    distractChance: 0.05,
  },
  cautious: {
    playCard:     { min: 1500, max: 3500 },
    respond:      { min: 1800, max: 3800 },
    targeting:    { min: 2000, max: 4000 },
    endTurn:      { min: 800,  max: 1800 },
    bankMoney:    { min: 1000, max: 2500 },
    distractChance: 0.08,
  },
  balanced: {
    playCard:     { min: 1000, max: 2800 },
    respond:      { min: 1200, max: 3000 },
    targeting:    { min: 1500, max: 3500 },
    endTurn:      { min: 600,  max: 1500 },
    bankMoney:    { min: 800,  max: 2000 },
    distractChance: 0.06,
  },
  strategic: {
    playCard:     { min: 1800, max: 4000 },
    respond:      { min: 2000, max: 4500 },
    targeting:    { min: 2500, max: 5000 },
    endTurn:      { min: 1000, max: 2000 },
    bankMoney:    { min: 1200, max: 2500 },
    distractChance: 0.03,
  },
  unpredictable: {
    playCard:     { min: 600,  max: 4000 },
    respond:      { min: 800,  max: 4500 },
    targeting:    { min: 1000, max: 5000 },
    endTurn:      { min: 400,  max: 2500 },
    bankMoney:    { min: 500,  max: 3000 },
    distractChance: 0.1,
  },
};

export function getBotDelay(personality = 'balanced', actionType = 'playCard') {
  const profile = PERSONALITY_PROFILES[personality] || PERSONALITY_PROFILES.balanced;
  const timing = profile[actionType] || profile.playCard;

  const base = gaussianRandom(timing.min, timing.max);
  const distracted = Math.random() < profile.distractChance;
  const distractDelay = distracted ? 1500 + Math.random() * 1500 : 0;
  const jitter = (Math.random() - 0.5) * 300;

  return Math.max(500, Math.round(base + distractDelay + jitter));
}

export function getBotCardPlayDelay(personality = 'balanced', cardNumber = 1) {
  const base = getBotDelay(personality, 'playCard');
  const multiplier = cardNumber === 1 ? 1.0 : cardNumber === 2 ? 0.5 : 0.3;
  return Math.max(400, Math.round(base * multiplier));
}

function gaussianRandom(min, max) {
  const u1 = Math.random();
  const u2 = Math.random();
  const u3 = Math.random();
  const avg = (u1 + u2 + u3) / 3;
  return min + avg * (max - min);
}

export function formatDelay(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
