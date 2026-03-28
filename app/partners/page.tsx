"use client";

import { useState, useEffect, useRef } from "react";
import Nav from "@/components/Nav";
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

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: "bg-slate-800/50", border: "border-slate-600/30", text: "text-slate-400" },
  rare: { bg: "bg-blue-900/20", border: "border-blue-500/30", text: "text-blue-400" },
  epic: { bg: "bg-purple-900/20", border: "border-purple-500/30", text: "text-purple-400" },
  legendary: { bg: "bg-amber-900/20", border: "border-amber-500/30", text: "text-amber-400" },
};

const RARITY_GRADIENT: Record<string, string> = {
  common: "from-slate-700/30 to-slate-900/50",
  rare: "from-blue-800/20 to-slate-900/50",
  epic: "from-purple-800/20 to-slate-900/50",
  legendary: "from-amber-700/20 via-amber-900/10 to-slate-900/50",
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
      <Nav />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Dates</h1>
            <p className="text-slate-500 text-sm mt-1">Pick your date for the table</p>
          </div>
          <div className="text-xs text-slate-500">{girlfriends.length} available</div>
        </div>

        {/* Rarity Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {["all", "legendary", "epic", "rare", "common"].map((r) => (
            <button key={r} onClick={() => setFilter(r)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition border ${
                filter === r ? "bg-violet-600 border-violet-500 text-white" : "bg-black/20 border-white/5 text-slate-500 hover:text-white"
              }`}>
              {r === "all" ? `All (${girlfriends.length})` : `${r} (${girlfriends.filter((g) => g.rarity === r).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading dates...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No dates yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((gf) => {
              const rc = RARITY_COLORS[gf.rarity] || RARITY_COLORS.common;
              const grad = RARITY_GRADIENT[gf.rarity] || RARITY_GRADIENT.common;
              return (
                <button key={gf.id} onClick={() => setSelected(gf)}
                  className={`${rc.bg} border ${rc.border} rounded-2xl p-3 sm:p-4 text-left hover:scale-[1.02] transition-all group`}>
                  {/* Preview card */}
                  <div className={`aspect-[3/4] bg-gradient-to-b ${grad} rounded-xl mb-3 flex flex-col items-center justify-center gap-2 relative overflow-hidden`}>
                    {gf.thumbnailUrl ? (
                      <img src={gf.thumbnailUrl} alt={gf.name} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="text-5xl">{gf.gender === "female" ? "👩" : "👨"}</div>
                        <div className="text-[9px] text-violet-400/60 font-bold uppercase tracking-wider">Tap to preview 3D</div>
                      </>
                    )}
                    {gf.modelUrl && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-violet-600/70 text-[8px] text-white font-bold">3D</div>
                    )}
                    {gf.rarity === "legendary" && (
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
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

      {/* ── Detail Modal with 3D Viewer ──────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* 3D Model or Image */}
            <div className="w-full h-[400px] sm:h-[500px] bg-black/50 rounded-t-2xl sm:rounded-t-2xl overflow-hidden relative">
              {selected.modelUrl ? (
                <ModelViewer url={selected.modelUrl} />
              ) : selected.thumbnailUrl ? (
                <img src={selected.thumbnailUrl} alt={selected.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-8xl opacity-20">{selected.gender === "female" ? "👩" : "👨"}</div>
                </div>
              )}
              <button onClick={() => setSelected(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition text-sm">&times;</button>
            </div>

            {/* Info */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                  <span className={`text-xs font-bold uppercase tracking-wider ${RARITY_COLORS[selected.rarity]?.text}`}>
                    {selected.rarity} &middot; {selected.style}
                  </span>
                </div>
                <div className="text-right">
                  {selected.isStarter ? (
                    <span className="text-emerald-400 text-sm font-bold">FREE</span>
                  ) : (
                    <span className="text-amber-400 text-sm font-bold">{selected.priceCredits} credits</span>
                  )}
                </div>
              </div>

              {selected.personality && (
                <p className="text-violet-300 text-sm italic mb-2">&ldquo;{selected.personality}&rdquo;</p>
              )}
              {selected.description && (
                <p className="text-slate-400 text-sm mb-2">{selected.description}</p>
              )}
              {selected.backstory && (
                <p className="text-slate-600 text-xs leading-relaxed mb-4">{selected.backstory}</p>
              )}

              <DateActions girlfriend={selected} onDone={() => { setSelected(null); /* reload */ fetch("/api/girlfriends?view=shop").then(r => r.json()).then(d => setGirlfriends(d.girlfriends || [])); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3D Model Viewer (fills container, proper framing) ────────────────────────

// ── Date Actions (Claim/Buy/Equip) ───────────────────────────────────────────

function DateActions({ girlfriend, onDone }: { girlfriend: Girlfriend; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleBuy() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/girlfriends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy", girlfriendId: girlfriend.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setMsg("Sign in to claim dates"); return; }
        throw new Error(data.error);
      }
      setMsg(data.message || "Claimed!");
      setTimeout(onDone, 1500);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEquip() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/girlfriends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "equip", girlfriendId: girlfriend.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) { setMsg("Sign in first"); return; }
        throw new Error(data.error);
      }
      setMsg("Equipped!");
      setTimeout(onDone, 1000);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        {girlfriend.isStarter ? (
          <button onClick={handleBuy} disabled={loading}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition disabled:opacity-50">
            {loading ? "Claiming..." : "Claim Free"}
          </button>
        ) : (
          <button onClick={handleBuy} disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-violet-500/15 disabled:opacity-50">
            {loading ? "Buying..." : `Buy for ${girlfriend.priceCredits} credits`}
          </button>
        )}
        <button onClick={handleEquip} disabled={loading}
          className="px-4 py-3 rounded-xl bg-pink-600/20 border border-pink-500/20 text-pink-300 font-bold text-sm hover:bg-pink-600/30 transition disabled:opacity-50">
          Equip
        </button>
      </div>
      {msg && <p className={`text-xs mt-2 text-center ${msg.includes("!") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
    </div>
  );
}

function ModelViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.01, 100);

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
    let rotY = 0.3;

    loader.load(url, (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2.2 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      // Center model at origin, slight offset up so feet are visible
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      scene.add(model);

      // Camera looks at center of model
      const h = size.y * scale;
      camera.position.set(0, h * 0.5, h * 1.6);
      camera.lookAt(0, h * 0.45, 0);

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
      if (model) { rotY += dt * 0.25; model.rotation.y = rotY; }
      const W = container.clientWidth, H = container.clientHeight;
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
      container.removeChild(canvas);
      renderer.dispose();
      dracoLoader.dispose();
      scene.clear();
    };
  }, [url]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/30 text-sm animate-pulse">Loading 3D model...</div>
        </div>
      )}
    </div>
  );
}
