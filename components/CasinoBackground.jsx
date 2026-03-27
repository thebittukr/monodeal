"use client";
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float } from "@react-three/drei";
import * as THREE from "three";

// ── City theme configs ────────────────────────────────────────────────────────
export const CITY_CONFIGS = {
  lasvegas:   { label: "🎰 Las Vegas",        sky: "#060600", neons: ["#ffd700","#ff6600","#fffaf0"], fogDist: 40 },
  tokyo:      { label: "🌸 Tokyo",            sky: "#080010", neons: ["#ff2d78","#bf5fff","#ff69b4"], fogDist: 30 },
  macau:      { label: "🐉 Macau",            sky: "#0d0000", neons: ["#ff1a1a","#ffd700","#ff8c00"], fogDist: 25 },
  montecarlo: { label: "🎯 Monte Carlo",      sky: "#00001a", neons: ["#4169e1","#b0c4de","#00bfff"], fogDist: 45 },
  singapore:  { label: "🌴 Singapore",        sky: "#000d08", neons: ["#00ff88","#00cfff","#ff00aa"], fogDist: 30 },
  atlantic:   { label: "🌊 Atlantic City",    sky: "#060010", neons: ["#9400d3","#00ffff","#ff007f"], fogDist: 35 },
  badenbaden: { label: "🏛️ Baden-Baden",      sky: "#0a0600", neons: ["#ffa500","#ffd700","#daa520"], fogDist: 50 },
  sanjose:    { label: "🌺 San José",         sky: "#001500", neons: ["#44ff44","#ffd700","#ff6a00"], fogDist: 30 },
  paradise:   { label: "🏝️ Paradise Island",  sky: "#00080f", neons: ["#00ffff","#ff69b4","#ffd700"], fogDist: 25 },
  london:     { label: "🎡 London",           sky: "#0a0600", neons: ["#ff4500","#ffd700","#dc143c"], fogDist: 55 },
  sydney:     { label: "🦘 Sydney",           sky: "#00051a", neons: ["#ff8c00","#00aaff","#00ff7f"], fogDist: 35 },
};

// ── City skyline buildings ────────────────────────────────────────────────────
function Skyline({ neons }) {
  const buildings = useMemo(() => {
    const rng = (seed) => ((seed * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: 32 }, (_, i) => ({
      x: (rng(i * 7 + 1) - 0.5) * 70,
      z: -18 - rng(i * 3 + 2) * 18,
      w: 0.6 + rng(i * 11 + 3) * 2.2,
      h: 2 + rng(i * 5 + 4) * 14,
      d: 0.6 + rng(i * 13 + 5) * 1.8,
      color: neons[i % neons.length],
    }));
  }, [neons.join(",")]);

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2 - 4, b.z]}>
          {/* Building body */}
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#0a0a0a" emissive={b.color} emissiveIntensity={0.08} roughness={0.9} />
          </mesh>
          {/* Roof glow */}
          <pointLight position={[0, b.h / 2, 0]} color={b.color} intensity={0.4} distance={4} />
        </group>
      ))}
    </group>
  );
}

// ── Floating playing card ─────────────────────────────────────────────────────
function FloatingCard({ x, y, z, color, delay, rotDir = 1 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + delay;
    ref.current.position.y = y + Math.sin(t * 0.4) * 0.35;
    ref.current.rotation.y = t * 0.2 * rotDir;
    ref.current.rotation.z = Math.sin(t * 0.25) * 0.15;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      {/* Card face */}
      <mesh>
        <boxGeometry args={[0.6, 0.85, 0.015]} />
        <meshStandardMaterial color="#faf8f0" emissive="#ffffff" emissiveIntensity={0.05} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Card color stripe */}
      <mesh position={[0, 0.1, 0.009]}>
        <boxGeometry args={[0.5, 0.6, 0.001]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ── Poker chip ────────────────────────────────────────────────────────────────
function Chip({ x, y, z, color, delay }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + delay;
    ref.current.rotation.y += 0.008;
    ref.current.position.y = y + Math.sin(t * 0.5) * 0.2;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.07, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.15} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      {/* Stripe ring */}
      <mesh>
        <torusGeometry args={[0.2, 0.025, 8, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ── Ambient particles ─────────────────────────────────────────────────────────
function Particles({ count = 120, color }) {
  const ref = useRef();
  const { positions, colors: colorsArr } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 8 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      colors[i * 3]     = c.r + (Math.random() - 0.5) * 0.4;
      colors[i * 3 + 1] = c.g + (Math.random() - 0.5) * 0.4;
      colors[i * 3 + 2] = c.b + (Math.random() - 0.5) * 0.4;
    }
    return { positions, colors };
  }, [count, color]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colorsArr, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// ── Neon ground ring ─────────────────────────────────────────────────────────
function GroundRing({ color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.elapsedTime * 0.05;
  });
  return (
    <group ref={ref} position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[6, 10, 14].map((r, i) => (
        <mesh key={i}>
          <ringGeometry args={[r - 0.05, r + 0.05, 64]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3 - i * 0.08} transparent opacity={0.5 - i * 0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ── Light beams ──────────────────────────────────────────────────────────────
function LightBeam({ angle, color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.15 + angle;
  });
  return (
    <group ref={ref} position={[0, -1, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2 - 0.3]}>
        <coneGeometry args={[0.08, 12, 8, 1, true]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Main 3D Scene ─────────────────────────────────────────────────────────────
function Scene({ config }) {
  const { sky, neons, fogDist } = config;
  const [n0, n1, n2] = neons;

  const floatingCards = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    x: (Math.random() - 0.5) * 14,
    y: 0.5 + Math.random() * 2.5,
    z: -2.5 - Math.random() * 9,
    color: neons[i % neons.length],
    delay: i * 0.8,
    rotDir: i % 2 === 0 ? 1 : -1,
  })), [neons.join(",")]);

  const chips = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    x: (Math.random() - 0.5) * 12,
    y: Math.random() * 1.5 - 0.5,
    z: -1.5 - Math.random() * 7,
    color: neons[i % neons.length],
    delay: i * 0.6,
  })), [neons.join(",")]);

  return (
    <>
      {/* Sky + Fog */}
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 12, fogDist]} />

      {/* Lighting */}
      <ambientLight intensity={0.15} color={n0} />
      <pointLight position={[0, 6, 0]}    intensity={3}   color={n1} distance={35} decay={2} />
      <pointLight position={[-10, 4, -6]} intensity={2}   color={n0} distance={25} decay={2} />
      <pointLight position={[10, 4, -6]}  intensity={2}   color={n2 ?? n0} distance={25} decay={2} />
      <pointLight position={[0, -0.5, 4]} intensity={1.5} color={n1} distance={15} decay={2} />

      {/* Stars */}
      <Stars radius={80} depth={40} count={2500} factor={3.5} fade speed={0.4} />

      {/* Ground — dark green felt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[80, 80, 1, 1]} />
        <meshStandardMaterial color="#071209" roughness={0.98} metalness={0.0} />
      </mesh>

      {/* City skyline */}
      <Skyline neons={neons} />

      {/* Floating cards */}
      {floatingCards.map((c, i) => <FloatingCard key={i} {...c} />)}

      {/* Poker chips */}
      {chips.map((c, i) => <Chip key={i} {...c} />)}

      {/* Particles */}
      <Particles count={100} color={n0} />

      {/* Ground neon rings */}
      <GroundRing color={n0} />

      {/* Light beams */}
      <LightBeam angle={0}    color={n1} />
      <LightBeam angle={2.1}  color={n2 ?? n0} />
      <LightBeam angle={4.2}  color={n0} />
    </>
  );
}

// ── Camera gentle orbit ───────────────────────────────────────────────────────
function CameraRig() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.04) * 0.8;
    camera.position.y = 2 + Math.sin(t * 0.06) * 0.3;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ── Public component ──────────────────────────────────────────────────────────
export default function CasinoBackground({ city = "lasvegas" }) {
  const config = CITY_CONFIGS[city] ?? CITY_CONFIGS.lasvegas;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 2, 9], fov: 55, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene config={config} />
          <CameraRig />
        </Suspense>
      </Canvas>
    </div>
  );
}
