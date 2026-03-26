/**
 * PropertyRush Sound Engine
 * Pure Web Audio API — zero external files, 100% royalty-free.
 * Generates procedural chiptune music + SFX.
 */

let ctx = null;
let musicGain = null;
let sfxGain   = null;
let musicLoop = null;
let enabled   = false;

function getCtx() {
  if (!ctx) {
    ctx      = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = ctx.createGain();
    sfxGain   = ctx.createGain();
    musicGain.gain.value = 0.12;
    sfxGain.gain.value   = 0.25;
    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);
  }
  return ctx;
}

// ─── Note frequencies ─────────────────────────────────────────────────────────
const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// ─── Soft pad oscillator ──────────────────────────────────────────────────────
function playNote(freq, start, duration, vol = 0.08, type = "sine", destination = null) {
  const c   = getCtx();
  const osc = c.createOscillator();
  const g   = c.createGain();

  osc.type      = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.05);

  osc.connect(g);
  g.connect(destination ?? musicGain);
  osc.start(start);
  osc.stop(start + duration);
}

// ─── Chord helper ────────────────────────────────────────────────────────────
function playChord(freqs, start, duration, vol = 0.07) {
  freqs.forEach((f) => playNote(f, start, duration, vol, "sine"));
  // Slightly detuned copy for warmth
  freqs.forEach((f) => playNote(f * 1.003, start, duration, vol * 0.5, "triangle"));
}

// ─── Background music loop ───────────────────────────────────────────────────
// Gentle ambient chord progression: C maj → A min → F maj → G maj
const PROGRESSION = [
  [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.C4],  // C major
  [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4],  // A minor
  [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4],  // F major
  [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4],  // G major
];

const MELODY = [
  // C chord section
  NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5,
  // A minor
  NOTE.A4, NOTE.C5, NOTE.E5, NOTE.C5,
  // F major
  NOTE.F4, NOTE.A4, NOTE.C5, NOTE.A4,
  // G major
  NOTE.G4, NOTE.B4, NOTE.D5, NOTE.B4,
];

function scheduleMusicBar(startTime) {
  const beatLen   = 0.5;   // seconds per beat
  const chordLen  = beatLen * 4;

  PROGRESSION.forEach((chord, ci) => {
    playChord(chord, startTime + ci * chordLen, chordLen * 1.05, 0.06);
  });

  MELODY.forEach((freq, i) => {
    playNote(freq, startTime + i * beatLen, beatLen * 0.7, 0.07, "triangle");
  });

  // Bass line (root notes, one octave down)
  PROGRESSION.forEach((chord, ci) => {
    playNote(chord[0] * 0.5, startTime + ci * chordLen, chordLen, 0.09, "sawtooth");
  });
}

export function startMusic() {
  if (!enabled) return;
  const c  = getCtx();
  let time = c.currentTime + 0.1;
  const barLen = 8; // 4 chords × 4 beats × 0.5s = 8s

  scheduleMusicBar(time);

  // Loop by scheduling next bar ~0.2s before current ends
  function scheduleNext() {
    time += barLen;
    scheduleMusicBar(time);
    musicLoop = setTimeout(scheduleNext, (barLen - 0.3) * 1000);
  }
  musicLoop = setTimeout(scheduleNext, (barLen - 0.3) * 1000);
}

export function stopMusic() {
  if (musicLoop) { clearTimeout(musicLoop); musicLoop = null; }
}

// ─── SFX ─────────────────────────────────────────────────────────────────────
export function sfxCardPlay() {
  if (!enabled) return;
  const c = getCtx();
  const t = c.currentTime;
  playNote(NOTE.G4, t,       0.06, 0.3, "square", sfxGain);
  playNote(NOTE.B4, t + 0.04, 0.06, 0.2, "square", sfxGain);
}

export function sfxCardDraw() {
  if (!enabled) return;
  const c = getCtx();
  const t = c.currentTime;
  playNote(NOTE.E4, t,       0.05, 0.2, "sine", sfxGain);
  playNote(NOTE.G4, t + 0.05, 0.05, 0.2, "sine", sfxGain);
}

export function sfxAction() {
  if (!enabled) return;
  const c = getCtx();
  const t = c.currentTime;
  // Descending dramatic
  [NOTE.G5, NOTE.E5, NOTE.C5, NOTE.G4].forEach((f, i) => {
    playNote(f, t + i * 0.07, 0.1, 0.25, "sawtooth", sfxGain);
  });
}

export function sfxWin() {
  if (!enabled) return;
  const c = getCtx();
  const t = c.currentTime;
  const melody = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5];
  melody.forEach((f, i) => {
    playNote(f, t + i * 0.12, 0.2, 0.3, "triangle", sfxGain);
  });
  // Chord punch at end
  setTimeout(() => {
    const t2 = getCtx().currentTime;
    playChord([NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], t2, 1.0, 0.15);
  }, melody.length * 120 + 50);
}

export function sfxJustSayNo() {
  if (!enabled) return;
  const c = getCtx();
  const t = c.currentTime;
  [NOTE.G4, NOTE.G4, NOTE.E4].forEach((f, i) => {
    playNote(f, t + i * 0.1, 0.12, 0.35, "square", sfxGain);
  });
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function setMusicEnabled(on) {
  enabled = on;
  if (on) {
    getCtx().resume?.();
    startMusic();
  } else {
    stopMusic();
  }
}

export function isMusicEnabled() {
  return enabled;
}
