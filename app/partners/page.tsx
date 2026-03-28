"use client";

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

interface Girlfriend {
  id: string;
  name: string;
  rarity: string;
  modelUrl: string;
  thumbnailUrl: string | null;
  priceCredits: number;
  style: string;
  gender: string;
  isStarter: boolean;
  description: string | null;
  personality: string | null;
  backstory: string | null;
  totalEquipped: number;
}

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: { bg: "bg-slate-800/50", border: "border-slate-600/30", text: "text-slate-400", glow: "" },
  rare: { bg: "bg-blue-900/20", border: "border-blue-500/30", text: "text-blue-400", glow: "shadow-blue-500/10" },
  epic: { bg: "bg-purple-900/20", border: "border-purple-500/30", text: "text-purple-400", glow: "shadow-purple-500/10" },
  legendary: { bg: "bg-amber-900/20", border: "border-amber-500/30", text: "text-amber-400", glow: "shadow-amber-500/20" },
};

export default function PartnersPage() {
  const [girlfriends, setGirlfriends] = useState<Girlfriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Girlfriend | null>(null);

  useEffect(() => {
    fetch("/api/girlfriends?view=shop")
      .then((r) => r.json())
      .then((data) => { setGirlfriends(data.girlfriends || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? girlfriends : girlfriends.filter((g) => g.rarity === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-black">P</div>
          <span className="text-white font-bold hidden sm:block">Property<span className="text-violet-400">Rush</span></span>
        </a>
        <div className="flex items-center gap-2">
          <a href="/credits" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition">Credits</a>
          <a href="/leaderboard" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition">Ranks</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Dates</h1>
            <p className="text-slate-500 text-sm mt-1">Pick your date for the table</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">{girlfriends.length} available</div>
          </div>
        </div>

        {/* Rarity Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {["all", "legendary", "epic", "rare", "common"].map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition border ${
                filter === r
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-black/20 border-white/5 text-slate-500 hover:text-white hover:border-white/10"
              }`}
            >
              {r === "all" ? `All (${girlfriends.length})` : `${r} (${girlfriends.filter((g) => g.rarity === r).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading partners...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No partners yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((gf) => {
              const rc = RARITY_COLORS[gf.rarity] || RARITY_COLORS.common;
              return (
                <button
                  key={gf.id}
                  onClick={() => setSelected(gf)}
                  className={`${rc.bg} border ${rc.border} rounded-2xl p-3 sm:p-4 text-left hover:scale-[1.02] transition-all shadow-lg ${rc.glow} group`}
                >
                  {/* Model card — click to see 3D preview in modal */}
                  <div className="aspect-[3/4] bg-gradient-to-b from-slate-800/50 to-black/40 rounded-xl mb-3 overflow-hidden relative">
                    {gf.thumbnailUrl ? (
                      <img src={gf.thumbnailUrl} alt={gf.name} className="w-full h-full object-cover" />
                    ) : (
                      <GridCardPreview modelUrl={gf.modelUrl} gender={gf.gender} />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition">{gf.name}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${rc.text}`}>{gf.rarity}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {gf.isStarter ? (
                        <span className="text-emerald-400 text-[10px] font-bold">FREE</span>
                      ) : (
                        <span className="text-amber-400 text-xs font-bold">{gf.priceCredits}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Partner Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                <span className={`text-xs font-bold uppercase tracking-wider ${RARITY_COLORS[selected.rarity]?.text}`}>
                  {selected.rarity} &middot; {selected.style}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-xl transition">&times;</button>
            </div>

            <div className="aspect-[3/4] bg-black/30 rounded-xl mb-4 overflow-hidden">
              {selected.modelUrl ? (
                <MiniModelViewer url={selected.modelUrl} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl opacity-30">{selected.gender === "female" ? "👩" : "👨"}</div>
                </div>
              )}
            </div>

            {selected.personality && (
              <p className="text-violet-300 text-sm italic mb-2">&ldquo;{selected.personality}&rdquo;</p>
            )}
            {selected.description && (
              <p className="text-slate-400 text-sm mb-2">{selected.description}</p>
            )}
            {selected.backstory && (
              <p className="text-slate-500 text-xs leading-relaxed mb-4">{selected.backstory}</p>
            )}


            <div className="flex gap-2">
              {selected.isStarter ? (
                <button className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition">
                  Claim Free
                </button>
              ) : (
                <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-violet-500/15">
                  Buy for {selected.priceCredits} credits
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Grid Card Preview (lightweight — renders model in small canvas) ───────────

function GridCardPreview({ modelUrl, gender }: { modelUrl: string; gender: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !modelUrl) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1); // low quality for grid performance
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 3 / 4, 0.01, 100);

    scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const key = new THREE.DirectionalLight(0xfff4e0, 2.5); key.position.set(1, 3, 2); scene.add(key);
    scene.add(new THREE.DirectionalLight(0xaabbff, 1.0)).position.set(-2, 1, 1);

    const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath("/draco/");
    const loader = new GLTFLoader(); loader.setDRACOLoader(dracoLoader);

    let model: THREE.Group | null = null;
    let rafId: number;
    let rotY = 0.3; // slight angle so it's not straight-on

    loader.load(modelUrl, (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2.0 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      model.rotation.y = rotY;
      scene.add(model);
      const h = size.y * scale;
      camera.position.set(0, h * 0.45, h * 1.5);
      camera.lookAt(0, h * 0.4, 0);

      // Just render a few frames then stop (save GPU)
      let frames = 0;
      function renderLoop() {
        if (frames > 30) return; // stop after 30 frames (~0.5s)
        rafId = requestAnimationFrame(renderLoop);
        frames++;
        if (model) { rotY += 0.02; model.rotation.y = rotY; }
        const W = canvas!.clientWidth, H = canvas!.clientHeight;
        if (W > 0 && H > 0) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
        renderer.render(scene, camera);
      }
      renderLoop();
      setLoaded(true);
    });

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      dracoLoader.dispose();
      scene.clear();
    };
  }, [modelUrl]);

  return (
    <>
      <canvas ref={canvasRef} className="w-full h-full block" style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.8s ease" }} />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xl animate-pulse">{gender === "female" ? "👩" : "👨"}</div>
        </div>
      )}
    </>
  );
}

// ── Mini 3D Model Viewer (used in detail modal) ─────────────────────────────

function MiniModelViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 3 / 4, 0.01, 100);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.Scene()).texture;
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xffffff, 3.0));
    const key = new THREE.DirectionalLight(0xfff4e0, 3.0); key.position.set(1.5, 3, 2); scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 1.2); fill.position.set(-2, 1, 1); scene.add(fill);
    scene.add(new THREE.DirectionalLight(0xffffff, 1.0)).position.set(0, 2, -3);

    const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath("/draco/");
    const loader = new GLTFLoader(); loader.setDRACOLoader(dracoLoader);

    let mixer: THREE.AnimationMixer | null = null;
    let model: THREE.Group | null = null;
    let rafId: number;
    let rotY = 0;

    loader.load(url, (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2.0 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      scene.add(model);
      // Frame the full body — camera centered on model, pulled back enough to see head to toe
      const scaledH = size.y * scale;
      camera.position.set(0, scaledH * 0.45, scaledH * 1.4);
      camera.lookAt(0, scaledH * 0.4, 0);
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
      if (model) { rotY += dt * 0.3; model.rotation.y = rotY; }
      const W = canvas!.clientWidth, H = canvas!.clientHeight;
      if (W > 0 && H > 0) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      dracoLoader.dispose();
      scene.clear();
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease" }}
    />
  );
}
