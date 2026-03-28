/**
 * PropertyRush — Date Narrator
 * Uses Web Speech API. Picks male or female voice based on equipped date's gender.
 */

let _voice = null;
let _gender = "female"; // default
let _enabled = false;

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();

  if (_gender === "male") {
    const maleTests = [
      (v) => v.name === 'Google UK English Male',
      (v) => v.name === 'Microsoft David Desktop - English (United States)',
      (v) => v.name === 'Daniel',
      (v) => v.name === 'Alex',
      (v) => /male/i.test(v.name) && !/female/i.test(v.name) && v.lang.startsWith('en'),
      (v) => v.lang.startsWith('en-') && !/female/i.test(v.name),
      (v) => v.lang.startsWith('en'),
    ];
    for (const t of maleTests) { const f = voices.find(t); if (f) return f; }
  } else {
    const femaleTests = [
      (v) => v.name === 'Google UK English Female',
      (v) => v.name === 'Microsoft Zira Desktop - English (United States)',
      (v) => v.name === 'Samantha',
      (v) => v.name === 'Karen',
      (v) => /female/i.test(v.name) && v.lang.startsWith('en'),
      (v) => v.lang.startsWith('en-'),
      (v) => v.lang.startsWith('en'),
    ];
    for (const t of femaleTests) { const f = voices.find(t); if (f) return f; }
  }
  return voices[0] ?? null;
}

export function setNarratorEnabled(on) { _enabled = on; }
export function isNarratorEnabled() { return _enabled; }

/** Set narrator gender — call when equipped date changes */
export function setNarratorGender(gender) {
  if (gender !== _gender) {
    _gender = gender || "female";
    _voice = null; // force re-pick
  }
}

export function narrateSpeak(text, rate = 0.92, pitch) {
  if (!_enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate;
  utter.pitch = pitch ?? (_gender === "male" ? 0.85 : 1.12);
  utter.volume = 0.8;
  if (!_voice) _voice = pickVoice();
  if (_voice) utter.voice = _voice;
  window.speechSynthesis.speak(utter);
}

const CHAR_PITCHES_F = [1.18, 1.08, 1.25, 1.05, 1.30, 1.15];
const CHAR_PITCHES_M = [0.80, 0.75, 0.85, 0.70, 0.90, 0.78];
const CHAR_RATES = [0.94, 0.90, 0.96, 0.88, 0.98, 0.92];

export function narrateCharacter(text, charIndex = 0) {
  if (!_enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking) return;
  const utter = new SpeechSynthesisUtterance(
    text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
  );
  const pitches = _gender === "male" ? CHAR_PITCHES_M : CHAR_PITCHES_F;
  utter.pitch = pitches[charIndex % pitches.length];
  utter.rate = CHAR_RATES[charIndex % CHAR_RATES.length];
  utter.volume = 0.7;
  if (!_voice) _voice = pickVoice();
  if (_voice) utter.voice = _voice;
  window.speechSynthesis.speak(utter);
}

export function narrateCardPlay(card) {
  if (!card) return;
  const map = {
    passgo: 'Pass Go — collect 2 million!',
    debtcollector: 'Debt Collector — someone pays up!',
    birthday: "It's your birthday — everyone pays!",
    slydeal: 'Sly Deal — stealing a property!',
    dealbreaker: 'Deal Breaker — taking a full set!',
    doublerent: "Double the rent — you'll pay double!",
    justsayno: 'Just Say No!',
    identityswap: 'Identity Swap!',
    taxtherich: 'Tax the Rich!',
    chaoscard: 'Chaos Card unleashed!',
    forceddeal: 'Forced Deal — hand it over!',
    wreckingball: 'Wrecking Ball — demolishing a set!',
    secondchance: 'Second Chance — drawing extra!',
    rent: 'Rent time — everyone pays!',
  };
  if (card.type === 'property') narrateSpeak(`Playing ${card.name}`);
  else if (card.type === 'money') narrateSpeak(`${card.value} million to the bank`);
  else if (card.type === 'action' && map[card.action]) narrateSpeak(map[card.action]);
  else if (card.type === 'rent') narrateSpeak('Rent card played!');
}

export function narrateYourTurn() {
  const femPhrases = ["Your turn, darling.", "It's your move.", "Your turn — make it count.", "Over to you."];
  const malPhrases = ["Your turn, champ.", "Let's go — your move.", "Show them what you've got.", "Over to you, boss."];
  const phrases = _gender === "male" ? malPhrases : femPhrases;
  narrateSpeak(phrases[Math.floor(Math.random() * phrases.length)]);
}

export function narrateJustSayNo() {
  const phrases = ['Just Say No!', 'Not today!', 'Absolutely not!'];
  narrateSpeak(phrases[Math.floor(Math.random() * phrases.length)], 1.0, _gender === "male" ? 0.9 : 1.25);
}

export function narrateWin(name) {
  narrateSpeak(`${name} wins! Congratulations!`, 0.88, _gender === "male" ? 0.85 : 1.1);
}

export function narrateCardDraw() {
  narrateSpeak('Drawing cards.');
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', () => { _voice = null; }, { once: true });
  }
}
