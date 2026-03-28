"use client";
import { useEffect, useRef, useState } from "react";

// ── City theme configs ────────────────────────────────────────────────────────
export const CITY_CONFIGS = {
  lasvegas:   { label: "🎰 Las Vegas",        neons: ["#ffd700","#ff6600","#ff3333"] },
  tokyo:      { label: "🌸 Tokyo",            neons: ["#ff2d78","#bf5fff","#ff69b4"] },
  macau:      { label: "🐉 Macau",            neons: ["#ff1a1a","#ffd700","#ff8c00"] },
  montecarlo: { label: "🎯 Monte Carlo",      neons: ["#4169e1","#b0c4de","#00bfff"] },
  singapore:  { label: "🌴 Singapore",        neons: ["#00ff88","#00cfff","#ff00aa"] },
  atlantic:   { label: "🌊 Atlantic City",    neons: ["#9400d3","#00ffff","#ff007f"] },
  badenbaden: { label: "🏛️ Baden-Baden",      neons: ["#ffa500","#ffd700","#daa520"] },
  sanjose:    { label: "🌺 San José",         neons: ["#44ff44","#ffd700","#ff6a00"] },
  paradise:   { label: "🏝️ Paradise Island",  neons: ["#00ffff","#ff69b4","#ffd700"] },
  london:     { label: "🎡 London",           neons: ["#ff4500","#ffd700","#dc143c"] },
  sydney:     { label: "🦘 Sydney",           neons: ["#ff8c00","#00aaff","#00ff7f"] },
};

// Local GLB model pool — Skye replaces the non-downloadable Host model
const CHAR_POOL = [
  { url: '/models/leggings.glb' },
  { url: '/models/kimberly.glb' },
  { url: '/models/helen.glb'    },
  { url: '/models/skye.glb'     }, // host
  { url: '/models/hips.glb'     },
  { url: '/models/crimson.glb'  },
];

// ── Speech line banks ─────────────────────────────────────────────────────────
const HYPE_LINES = [
  "You're a real deal! 💪",
  "That's my champion! ✨",
  "Unstoppable tonight! 🌟",
  "High roller energy! 🎲",
  "Eyes on the prize! 👀",
  "Make that power move! ⚡",
  "Vegas would love you 🎰",
  "Born to win, darling! 👑",
  "You've got this in the bag! 💼",
  "The table is YOURS tonight! 🏆",
  "Pure genius. I'm obsessed. 😍",
  "They never saw it coming! 💥",
  "Look at you go! Incredible! 🤩",
  "This is YOUR moment! 🌠",
  "Flawless strategy, honey! ♟️",
  "The cards are whispering your name 🃏",
  "This table has never seen anything like you 🌟",
];

const LOSS_LINES = [
  "Sorry for your loss, honey 😢",
  "Don't you dare give up! 😤",
  "They got lucky. You've got skill 🃏",
  "Shake it off, darling 💅",
  "I didn't come here to watch you lose 👀",
  "Ooh that stings… but you're still standing! 💔",
  "Revenge is a dish best served cold 🧊",
  "Pain is temporary, victory is forever 🔥",
  "Even champions take a hit sometimes 🥊",
  "That was rough. Come back stronger! 💪",
  "They played dirty. You'll play smarter. 🧠",
  "Don't let them see you sweat, darling 😤",
];

const SASSY_LINES = [
  "Oh honey, is that the best you've got? 😏",
  "Cute move. Now watch mine 💋",
  "Bless your heart… you tried 🙈",
  "The audacity! I love it 🔥",
  "They're shaking in their boots right now 😈",
  "Oh darling, the drama! 🎭",
  "Play your cards right — no pun intended 😉",
  "That was bold. I respect it 💎",
  "Someone's getting greedy… I like it 😼",
  "Oh the nerve! Absolutely unhinged. 😂",
  "I would never… but I understand why you did 👀",
  "Scandalous. Absolutely scandalous! 🌶️",
  "Did they really just do that? Bold! 😤",
  "Honey, you're playing 4D chess 🧩",
  "Look at the brain on this one! 🧠",
  "Messy but iconic, honestly 💅",
];

// Short burst lines on card play
const CARD_REACT_LINES = [
  "Ooh, bold move! 🎴",
  "Yes! Play it! ✨",
  "That's the one! 🔥",
  "Make them pay! 💸",
  "I love this! 😍",
  "Go go go! 🚀",
  "Yesss! 💪",
  "The drama! 😱",
  "Iconic! 🌟",
  "They won't recover from that! 😈",
];

// WebGL character rendering removed for performance.
// Using static avatar images instead. Will switch to pre-rendered PNGs when available.

// Positions that stay near edges so girls peek out beside the game board
function getPositions(n) {
  if (n <= 0) return [];
  if (n === 1) return [8];
  if (n === 2) return [8, 92];
  if (n === 3) return [6, 50, 94];
  if (n === 4) return [6, 22, 78, 94];
  if (n === 5) return [5, 17, 50, 83, 95];
  return Array.from({ length: n }, (_, i) => 5 + (90 / (n - 1)) * i);
}

// ── Character dimensions ───────────────────────────────────────────────────────
const CHAR_W = 140;
const CHAR_H = 420;

// ── Single shared-renderer stage — ONE WebGL context for BOTH girls ────────────
// Uses scissor/viewport to draw each model into its own region of one canvas.
function CharacterStage({ slots, positions }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || slots.length === 0) return;

    // ONE renderer — replaces N individual contexts
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap to save VRAM
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);

    // Shared env map — generated ONCE, reused by every scene
    const pmrem = new THREE.PMREMGenerator(renderer);
    const sharedEnv = pmrem.fromScene(new THREE.Scene()).texture;
    pmrem.dispose();

    function makeScene() {
      const sc = new THREE.Scene();
      sc.environment = sharedEnv;
      sc.add(new THREE.AmbientLight(0xffffff, 3.0));
      const key = new THREE.DirectionalLight(0xfff4e0, 3.0);
      key.position.set(1.5, 3, 2); sc.add(key);
      const fill = new THREE.DirectionalLight(0xaabbff, 1.2);
      fill.position.set(-2, 1, 1); sc.add(fill);
      const back = new THREE.DirectionalLight(0xffffff, 1.0);
      back.position.set(0, 2, -3); sc.add(back);
      return sc;
    }

    const chars = slots.map((_, i) => ({
      scene:    makeScene(),
      camera:   new THREE.PerspectiveCamera(42, CHAR_W / CHAR_H, 0.01, 100),
      mixer:    null,
      model:    null,
      rotY:     Math.random() * Math.PI * 2,
      spinRate: 0.16 + (i % 4) * 0.025 + Math.random() * 0.04,
      ready:    false,
    }));

    const loader = new GLTFLoader();
    loader.setDRACOLoader(getDracoLoader());
    let loadedN = 0;

    chars.forEach((cd, i) => {
      loader.load(slots[i].url, (gltf) => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const ctr   = box.getCenter(new THREE.Vector3());
        const sc    = 2.0 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(sc);
        // Position model so feet are at the bottom of the viewport
        model.position.set(-ctr.x * sc, -box.min.y * sc, -ctr.z * sc);
        cd.scene.add(model);
        cd.model = model;

        const sh = size.y * sc;
        // Camera pulled back far enough to see full body in narrow viewport
        cd.camera.position.set(0, sh * 0.5, sh * 2.0);
        cd.camera.lookAt(0, sh * 0.45, 0);

        if (gltf.animations.length > 0) {
          cd.mixer = new THREE.AnimationMixer(model);
          cd.mixer.clipAction(gltf.animations[0]).play();
        }
        cd.ready = true;
        loadedN += 1;
        if (loadedN === slots.length) setReady(true);
      });
    });

    const clock = new THREE.Clock();
    let rafId;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW > 0 && cssH > 0) renderer.setSize(cssW, cssH, false);

      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);

      chars.forEach((cd, i) => {
        if (!cd.ready || !cd.model) return;
        if (cd.mixer) cd.mixer.update(dt);
        cd.rotY += dt * cd.spinRate;
        cd.model.rotation.y = cd.rotY;

        const W = canvas.clientWidth, H = canvas.clientHeight;
        const cx = Math.round((positions[i] / 100) * W);
        const left = cx - CHAR_W / 2;
        const h    = Math.min(CHAR_H, H);

        if (left + CHAR_W < 0 || left > W) return; // off-screen

        renderer.setViewport(left, 0, CHAR_W, h);
        renderer.setScissor(left, 0, CHAR_W, h);
        cd.camera.aspect = CHAR_W / h;
        cd.camera.updateProjectionMatrix();
        renderer.clearDepth();
        renderer.render(cd.scene, cd.camera);
      });
      renderer.setScissorTest(false);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      chars.forEach(cd => {
        if (cd.model) {
          cd.model.traverse(child => {
            if (!child.isMesh) return;
            child.geometry?.dispose();
            (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => {
              if (!m) return;
              Object.values(m).forEach(v => { if (v?.isTexture) v.dispose(); });
              m.dispose?.();
            });
          });
        }
        cd.scene.clear();
      });
      sharedEnv.dispose();
      renderer.dispose();
    };
  }, [slots.map(s => s.url).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        display: 'block', pointerEvents: 'none',
        opacity: ready ? 1 : 0, transition: 'opacity 1.8s ease',
      }}
    />
  );
}

// ── Pure-HTML speech bubble overlay (no WebGL) ─────────────────────────────────
function CharacterBubble({ charIndex, playerName, posLeft, bubbleDelayMs, gameActive, forceReactLine }) {
  const [bubble,     setBubble]     = useState('');
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    if (!forceReactLine) return;
    setBubble(forceReactLine);
    setShowBubble(true);
    if (gameActive) narrateCharacter(forceReactLine, charIndex);
    const t = setTimeout(() => setShowBubble(false), 3500);
    return () => clearTimeout(t);
  }, [forceReactLine]); // eslint-disable-line react-hooks/exhaustive-deps

  // No random chatter — date only reacts to game events via forceReactLine

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: `${posLeft}%`,
      transform: 'translateX(-50%)', width: CHAR_W, height: CHAR_H,
      pointerEvents: 'none',
    }}>
      {/* Bubble */}
      <div style={{
        position: 'absolute', bottom: '102%', left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,10,30,0.93)',
        border: '1px solid rgba(180,130,255,0.35)',
        borderRadius: 12, padding: '6px 10px',
        fontSize: 11, fontWeight: 600, color: '#ead8ff',
        whiteSpace: 'nowrap', maxWidth: 220, pointerEvents: 'none',
        opacity: showBubble ? 1 : 0, transition: 'opacity 0.4s ease',
        zIndex: 30, boxShadow: '0 2px 16px rgba(120,60,200,0.4)',
      }}>
        {bubble}
        <div style={{
          position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
          borderTop: '7px solid rgba(180,130,255,0.35)',
        }} />
      </div>
      {playerName && (
        <div style={{
          position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, fontWeight: 700, color: 'rgba(200,180,255,0.85)',
          whiteSpace: 'nowrap', letterSpacing: '0.05em',
        }}>
          {playerName}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CasinoBackground({
  city          = "lasvegas",
  cheering      = false,
  players       = [],
  gameActive    = false,   // true only while game.phase === "playing"
  reactionTrigger = 0,     // bumped by parent whenever a card is played
  lossTarget    = -1,      // player index that just suffered a negative action
}) {
  // Which slot is reacting to a card play, and what line it shows
  const [reactingSlot,     setReactingSlot]     = useState(-1);
  const [reactingLine,     setReactingLine]      = useState('');
  const [lossSlot,         setLossSlot]          = useState(-1);
  const [lossLine,         setLossLine]          = useState('');

  // Always show Crimson as the default date — only ONE model loaded for performance.
  // When player has an equipped date, that model URL would be passed in instead.
  const DEFAULT_MODEL = '/models/crimson.glb';

  const singleSlot = players.length > 0
    ? { url: DEFAULT_MODEL, playerName: players[0]?.name ?? '', charIndex: 0, bubbleDelayMs: 8000 }
    : { url: DEFAULT_MODEL, playerName: '', charIndex: 0, bubbleDelayMs: 9000 };

  const displaySlots     = [singleSlot];
  const displayPositions = [92]; // right edge — always fully visible, never hides game UI

  // Card-play reaction: pick a random display slot
  useEffect(() => {
    if (!reactionTrigger || displaySlots.length === 0) return;
    const idx  = Math.floor(Math.random() * displaySlots.length);
    const pool = Math.random() < 0.6 ? CARD_REACT_LINES : HYPE_LINES;
    const line = pool[Math.floor(Math.random() * pool.length)];
    setReactingSlot(idx);
    setReactingLine(line);
    const t = setTimeout(() => setReactingSlot(-1), 4000);
    return () => clearTimeout(t);
  }, [reactionTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loss reaction
  useEffect(() => {
    if (lossTarget < 0 || displaySlots.length === 0) return;
    const idx  = lossTarget % displaySlots.length;
    const pool = Math.random() < 0.7 ? LOSS_LINES : SASSY_LINES;
    const line = pool[Math.floor(Math.random() * pool.length)];
    setLossSlot(idx);
    setLossLine(line);
    const t = setTimeout(() => setLossSlot(-1), 5000);
    return () => clearTimeout(t);
  }, [lossTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      {/* CSS background — city-themed gradient, zero WebGL */}
      <div style={{
        position: 'absolute', inset: 0,
        background: (() => {
          const cfg = CITY_CONFIGS[city] || CITY_CONFIGS.lasvegas;
          const [c1, c2, c3] = cfg.neons;
          return cheering
            ? `radial-gradient(ellipse 90% 60% at 20% 100%, ${c1}55 0%, transparent 55%),
               radial-gradient(ellipse 90% 60% at 80% 100%, ${c2}55 0%, transparent 55%),
               radial-gradient(ellipse 60% 40% at 50% 100%, ${c3}44 0%, transparent 45%),
               linear-gradient(180deg, #010108 0%, #060012 60%, #0d0020 100%)`
            : `radial-gradient(ellipse 70% 50% at 15% 100%, ${c1}30 0%, transparent 55%),
               radial-gradient(ellipse 70% 50% at 85% 100%, ${c2}30 0%, transparent 55%),
               radial-gradient(ellipse 40% 30% at 50% 100%, ${c3}20 0%, transparent 40%),
               linear-gradient(180deg, #010108 0%, #04010e 60%, #080018 100%)`;
        })(),
      }} />

      {/* Desktop: Animated WebM character (VP9 alpha = true transparency, 322KB) */}
      <div className="hidden sm:block" style={{ position: 'fixed', inset: 0, zIndex: 18, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 280, height: '80vh', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <video src="/dates/crimson.webm" autoPlay loop muted playsInline style={{ maxHeight: '75vh', width: 'auto', objectFit: 'contain' }} />
        </div>

        {displaySlots.map((slot, i) => (
          <CharacterBubble
            key={slot.url + i}
            charIndex={slot.charIndex}
            playerName={slot.playerName}
            posLeft={displayPositions[i]}
            bubbleDelayMs={slot.bubbleDelayMs}
            gameActive={gameActive}
            forceReactLine={
              reactingSlot === i ? reactingLine :
              lossSlot     === i ? lossLine     : ''
            }
          />
        ))}
      </div>

      {/* Mobile: smaller GIF, bottom-right */}
      <div className="sm:hidden" style={{ position: 'fixed', bottom: 0, right: -10, zIndex: 18, pointerEvents: 'none', width: 130 }}>
        <video src="/dates/crimson.webm" autoPlay loop muted playsInline style={{ width: '100%' }} />
        {displaySlots[0] && (
          <CharacterBubble
            charIndex={displaySlots[0].charIndex}
            playerName=""
            posLeft={50}
            bubbleDelayMs={12000}
            gameActive={gameActive}
            forceReactLine={reactingSlot === 0 ? reactingLine : (lossSlot === 0 ? lossLine : '')}
          />
        )}
      </div>
    </div>
  );
}
