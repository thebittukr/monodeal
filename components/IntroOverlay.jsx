"use client";
/**
 * IntroOverlay — full-screen interstitial shown right before entering a room.
 * One randomly-picked girl renders in the centre and delivers a hype line via
 * speech-bubble + Web Speech API.  Auto-advances after 4 s or on tap/click.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// ── Model pool (same as CasinoBackground) ─────────────────────────────────────
const INTRO_MODELS = [
  "/models/leggings.glb",
  "/models/kimberly.glb",
  "/models/helen.glb",
  "/models/skye.glb",
  "/models/hips.glb",
  "/models/crimson.glb",
];

// ── Hype lines the girl can say ────────────────────────────────────────────────
const HYPE_LINES = [
  "Honey, you have to win for me! 💋",
  "Don't you dare lose, darling! 👑",
  "I'm counting on you, gorgeous! 💎",
  "Win this one for me, baby! 🔥",
  "Make them regret showing up! 😈",
  "You've got this — now go get it! ✨",
  "I believe in you. Don't let me down! 💅",
];

// ── Shared Draco loader ────────────────────────────────────────────────────────
let _draco = null;
function getDraco() {
  if (!_draco) {
    _draco = new DRACOLoader();
    _draco.setDecoderPath("/draco/");
  }
  return _draco;
}

// ── Mini 3-D canvas for the intro girl ────────────────────────────────────────
function GirlCanvas({ url }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);

    // Neutral env + strong lights
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env   = pmrem.fromScene(new THREE.Scene()).texture;
    scene.environment = env;
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xffffff, 3.2));
    const key  = new THREE.DirectionalLight(0xfff4e0, 3.2); key.position.set(1.5, 3, 2);  scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 1.4); fill.position.set(-2, 1, 1);   scene.add(fill);
    const back = new THREE.DirectionalLight(0xffffff, 1.0); back.position.set(0, 2, -3);   scene.add(back);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(getDraco());

    let mixer = null, model = null, rafId = null;
    let rotY = Math.random() * Math.PI * 2;
    const spinRate = 0.18 + Math.random() * 0.06;

    loader.load(url, (gltf) => {
      model = gltf.scene;
      const box   = new THREE.Box3().setFromObject(model);
      const size  = box.getSize(new THREE.Vector3());
      const ctr   = box.getCenter(new THREE.Vector3());
      const sc    = 2.0 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(sc);
      model.position.set(-ctr.x * sc, -ctr.y * sc + size.y * sc * 0.05, -ctr.z * sc);
      scene.add(model);

      const sh = size.y * sc;
      camera.position.set(0, sh * 0.42, sh * 1.1);
      camera.lookAt(0, sh * 0.42, 0);

      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }
      setLoaded(true);
    });

    const clock = new THREE.Clock();
    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);
      if (model) { rotY += dt * spinRate; model.rotation.y = rotY; }
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (W > 0 && H > 0) {
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      if (model) {
        model.traverse(child => {
          if (!child.isMesh) return;
          child.geometry?.dispose();
          (Array.isArray(child.material) ? child.material : [child.material])
            .forEach(m => { Object.values(m ?? {}).forEach(v => { if (v?.isTexture) v.dispose(); }); m?.dispose?.(); });
        });
      }
      env.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%", height: "100%", display: "block",
        opacity: loaded ? 1 : 0, transition: "opacity 1.2s ease",
      }}
    />
  );
}

// ── Speak via Web Speech API (no narrator dependency needed here) ──────────────
function speakLine(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\x00-\x7F]/g, "").trim());
  u.rate  = 0.92;
  u.pitch = 1.2;
  u.volume = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const best = voices.find(v => v.name === "Google UK English Female")
            || voices.find(v => /female/i.test(v.name) && v.lang.startsWith("en"))
            || voices.find(v => v.lang.startsWith("en"));
  if (best) u.voice = best;
  window.speechSynthesis.speak(u);
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function IntroOverlay({ onDone }) {
  const [line]        = useState(() => HYPE_LINES[Math.floor(Math.random() * HYPE_LINES.length)]);
  const [modelUrl]    = useState(() => INTRO_MODELS[Math.floor(Math.random() * INTRO_MODELS.length)]);
  const [showBubble,  setShowBubble]  = useState(false);
  const [progress,    setProgress]    = useState(0);   // 0→100 in 4 s
  const doneRef = useRef(false);

  const advance = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    window.speechSynthesis?.cancel();
    onDone();
  }, [onDone]);

  // Show bubble after 600 ms, narrate, then auto-advance at 4.5 s
  useEffect(() => {
    const t1 = setTimeout(() => {
      setShowBubble(true);
      speakLine(line);
    }, 600);
    const t2 = setTimeout(advance, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [advance, line]);

  // Progress bar
  useEffect(() => {
    const start = Date.now();
    const total = 4500;
    const tick = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / total) * 100);
      setProgress(p);
      if (p >= 100) clearInterval(tick);
    }, 40);
    return () => clearInterval(tick);
  }, []);

  return (
    <div
      onClick={advance}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(2,0,12,0.96)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {/* Background subtle glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 80%, rgba(100,40,180,0.25) 0%, transparent 70%)",
      }} />

      {/* Girl canvas */}
      <div style={{
        position: "relative", width: 220, height: 500,
        flexShrink: 0,
      }}>
        <GirlCanvas url={modelUrl} />

        {/* Speech bubble */}
        <div style={{
          position: "absolute", top: 0, left: "50%",
          transform: "translate(-50%, -110%)",
          background: "rgba(15,8,35,0.96)",
          border: "1.5px solid rgba(200,140,255,0.5)",
          borderRadius: 16, padding: "10px 16px",
          fontSize: 15, fontWeight: 700, color: "#f0d8ff",
          whiteSpace: "nowrap", pointerEvents: "none",
          opacity: showBubble ? 1 : 0,
          transition: "opacity 0.5s ease",
          boxShadow: "0 4px 24px rgba(140,60,255,0.35)",
          zIndex: 10,
        }}>
          {line}
          <div style={{
            position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
            borderTop: "9px solid rgba(200,140,255,0.5)",
          }} />
        </div>
      </div>

      {/* Tap hint */}
      <p style={{
        marginTop: 18, fontSize: 12, color: "rgba(200,160,255,0.5)",
        letterSpacing: "0.08em", userSelect: "none",
      }}>
        Tap anywhere to continue
      </p>

      {/* Progress bar */}
      <div style={{
        marginTop: 14, width: 180, height: 3,
        background: "rgba(255,255,255,0.08)", borderRadius: 99,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: "linear-gradient(90deg, #7c3aed, #c084fc)",
          borderRadius: 99, transition: "width 0.04s linear",
        }} />
      </div>
    </div>
  );
}
