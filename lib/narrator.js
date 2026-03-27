/**
 * PropertyRush — Soft Female Narrator
 * Uses Web Speech API. Picks the best female English voice available.
 */

let _voice = null;
let _enabled = false;

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const tests = [
    (v) => v.name === 'Google UK English Female',
    (v) => v.name === 'Microsoft Zira Desktop - English (United States)',
    (v) => v.name === 'Samantha',
    (v) => v.name === 'Karen',
    (v) => /female/i.test(v.name) && v.lang.startsWith('en'),
    (v) => v.lang.startsWith('en-'),
    (v) => v.lang.startsWith('en'),
  ];
  for (const t of tests) { const f = voices.find(t); if (f) return f; }
  return voices[0] ?? null;
}

export function setNarratorEnabled(on) { _enabled = on; }
export function isNarratorEnabled() { return _enabled; }

export function narrateSpeak(text, rate = 0.92, pitch = 1.12) {
  if (!_enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate; utter.pitch = pitch; utter.volume = 0.8;
  if (!_voice) _voice = pickVoice();
  if (_voice) utter.voice = _voice;
  window.speechSynthesis.speak(utter);
}

// Character bubble speech — low priority: skips if game narrator is already talking
// Each character index gets a slightly different pitch so they sound distinct
const CHAR_PITCHES = [1.18, 1.08, 1.25, 1.05, 1.30, 1.15];
const CHAR_RATES   = [0.94, 0.90, 0.96, 0.88, 0.98, 0.92];
export function narrateCharacter(text, charIndex = 0) {
  if (!_enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking) return; // don't interrupt game narration
  const utter = new SpeechSynthesisUtterance(
    // Strip emoji for cleaner TTS
    text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
  );
  utter.pitch  = CHAR_PITCHES[charIndex % CHAR_PITCHES.length];
  utter.rate   = CHAR_RATES[charIndex % CHAR_RATES.length];
  utter.volume = 0.7;
  if (!_voice) _voice = pickVoice();
  if (_voice) utter.voice = _voice;
  window.speechSynthesis.speak(utter);
}

export function narrateCardPlay(card) {
  if (!card) return;
  const map = {
    passgo:       'Pass Go — collect 2 million!',
    debtcollector:'Debt Collector — someone pays up!',
    birthday:     "It's your birthday — everyone pays!",
    slydeal:      'Sly Deal — stealing a property!',
    dealbreaker:  'Deal Breaker — taking a full set!',
    doublerent:   'Double the rent — you\'ll pay double!',
    justsayno:    'Just Say No!',
    identityswap: 'Identity Swap!',
    taxtherich:   'Tax the Rich!',
    timewarp:     'Time Warp — going back in time!',
    chaoscard:    'Chaos Card unleashed!',
    forceddeal:   'Forced Deal — hand it over!',
    wreckingball: 'Wrecking Ball — demolishing a set!',
    propertytax:  'Property Tax — pay up!',
    secondchance: 'Second Chance — drawing extra!',
    rent:         'Rent time — everyone pays!',
  };
  if (card.type === 'property') narrateSpeak(`Playing ${card.name}`);
  else if (card.type === 'money') narrateSpeak(`${card.value} million to the bank`);
  else if (card.type === 'action' && map[card.action]) narrateSpeak(map[card.action]);
  else if (card.type === 'rent') narrateSpeak('Rent card played!');
}

export function narrateYourTurn() {
  const phrases = [
    "Your turn, darling.",
    "It's your move.",
    "Your turn — make it count.",
    "Over to you.",
  ];
  narrateSpeak(phrases[Math.floor(Math.random() * phrases.length)]);
}

export function narrateJustSayNo() {
  const phrases = ['Just Say No!', 'Not today!', 'Absolutely not!'];
  narrateSpeak(phrases[Math.floor(Math.random() * phrases.length)], 1.0, 1.25);
}

export function narrateWin(name) {
  narrateSpeak(`${name} wins! Congratulations, ${name}!`, 0.88, 1.1);
}

export function narrateCardDraw() {
  narrateSpeak('Drawing cards.');
}

// Preload voices list when API fires
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', () => { _voice = null; pickVoice(); }, { once: true });
  }
}
