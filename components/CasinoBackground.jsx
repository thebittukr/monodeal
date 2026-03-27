"use client";
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import { getAvatar } from "@/lib/avatars";

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

// ── Deterministic RNG ────────────────────────────────────────────────────────
const rng = (seed) => ((seed * 9301 + 49297) % 233280) / 233280;

// ── Casino Table ──────────────────────────────────────────────────────────────
function CasinoTable({ neons }) {
  return (
    <group position={[0, -1.35, 0.5]}>
      {/* Main felt surface */}
      <mesh receiveShadow>
        <cylinderGeometry args={[4.2, 4.2, 0.18, 48]} />
        <meshStandardMaterial color="#0c3d18" roughness={0.97} metalness={0.0} />
      </mesh>

      {/* Inner felt pattern */}
      <mesh position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 3.8, 48]} />
        <meshStandardMaterial color="#0e4a1f" roughness={0.95} />
      </mesh>

      {/* Gold outer rim */}
      <mesh position={[0, 0.07, 0]}>
        <torusGeometry args={[4.2, 0.14, 10, 56]} />
        <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.25} emissive="#8B6914" emissiveIntensity={0.35} />
      </mesh>

      {/* Inner gold ring */}
      <mesh position={[0, 0.095, 0]}>
        <torusGeometry args={[3.7, 0.06, 8, 48]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} emissive="#8B6914" emissiveIntensity={0.2} />
      </mesh>

      {/* Betting circle spots */}
      {[0,1,2,3,4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + Math.PI * 0.1;
        const r = 2.6;
        return (
          <mesh key={i} position={[Math.cos(a)*r, 0.1, Math.sin(a)*r]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.28, 0.34, 32]} />
            <meshStandardMaterial color="#c9a227" emissive="#c9a227" emissiveIntensity={0.4} transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Center dealer diamond */}
      <mesh position={[0, 0.1, -1.2]} rotation={[-Math.PI/2, 0, Math.PI/4]}>
        <ringGeometry args={[0, 0.4, 4]} />
        <meshStandardMaterial color="#c9a227" emissive="#c9a227" emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>

      {/* Table pedestal */}
      <mesh position={[0, -0.6, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.9, 0.9, 20]} />
        <meshStandardMaterial color="#1a0d00" roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.08, 20]} />
        <meshStandardMaterial color="#1a0d00" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Chip stacks on table */}
      {[[-3.5, 0.12, 0.8], [3.5, 0.12, 0.8], [-3.2, 0.12, -0.5], [3.2, 0.12, -0.5]].map(([x,y,z], i) => (
        <group key={i} position={[x, y, z]}>
          {[0,1,2,3].map((j) => (
            <mesh key={j} position={[0, j * 0.055, 0]}>
              <cylinderGeometry args={[0.18, 0.18, 0.05, 20]} />
              <meshStandardMaterial
                color={neons[j % neons.length]}
                metalness={0.7} roughness={0.2}
                emissive={neons[j % neons.length]} emissiveIntensity={0.2}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Under-table neon glow */}
      <pointLight position={[0, -0.3, 0]} color={neons[0]} intensity={1.5} distance={5} decay={2} />
    </group>
  );
}

// ── Stylized Girl Figure ──────────────────────────────────────────────────────
function CrowdGirl({ position, rotation, dressColor, hairColor, phase, cheering = false }) {
  const rootRef    = useRef();
  const lArmRef    = useRef();
  const rArmRef    = useRef();
  const headRef    = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (!rootRef.current) return;

    if (cheering) {
      rootRef.current.position.y = position[1] + Math.abs(Math.sin(t * 5)) * 0.18;
      rootRef.current.rotation.z = Math.sin(t * 5) * 0.06;
      if (lArmRef.current) lArmRef.current.rotation.z = -0.4 - Math.abs(Math.sin(t * 5)) * 0.8;
      if (rArmRef.current) rArmRef.current.rotation.z =  0.4 + Math.abs(Math.sin(t * 5)) * 0.8;
      if (headRef.current) headRef.current.rotation.z = Math.sin(t * 5) * 0.08;
    } else {
      rootRef.current.position.y = position[1] + Math.sin(t * 0.9) * 0.018;
      rootRef.current.rotation.z = Math.sin(t * 0.7) * 0.035;
      if (lArmRef.current) lArmRef.current.rotation.z = -0.25 + Math.sin(t * 0.7) * 0.08;
      if (rArmRef.current) rArmRef.current.rotation.z =  0.25 - Math.sin(t * 0.7) * 0.08;
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
    }
  });

  const skin = "#f5c9a8";

  return (
    <group ref={rootRef} position={position} rotation={rotation}>
      {/* Legs */}
      {[-0.07, 0.07].map((x, i) => (
        <mesh key={i} position={[x, -0.42, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.38, 8]} />
          <meshStandardMaterial color={skin} roughness={0.75} />
        </mesh>
      ))}
      {/* Shoes */}
      {[-0.07, 0.07].map((x, i) => (
        <mesh key={i} position={[x, -0.63, 0.04]}>
          <boxGeometry args={[0.07, 0.06, 0.14]} />
          <meshStandardMaterial color="#1a0a00" roughness={0.6} />
        </mesh>
      ))}

      {/* Dress skirt */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.25, 0.30, 0.52, 10]} />
        <meshStandardMaterial color={dressColor} roughness={0.7} emissive={dressColor} emissiveIntensity={0.12} />
      </mesh>

      {/* Dress bodice */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.14, 0.21, 0.32, 10]} />
        <meshStandardMaterial color={dressColor} roughness={0.65} emissive={dressColor} emissiveIntensity={0.15} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.1, 8]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>

      {/* Head */}
      <group ref={headRef}>
        <mesh position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.135, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Hair back */}
        <mesh position={[0, 0.67, -0.02]}>
          <sphereGeometry args={[0.145, 16, 16]} />
          <meshStandardMaterial color={hairColor} roughness={0.92} />
        </mesh>
        {/* Hair top */}
        <mesh position={[0, 0.79, 0]}>
          <sphereGeometry args={[0.1, 14, 14]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
        {/* Eyes hint */}
        <mesh position={[-0.045, 0.63, 0.12]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#1a0a00" />
        </mesh>
        <mesh position={[0.045, 0.63, 0.12]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#1a0a00" />
        </mesh>
        {/* Smile */}
        <mesh position={[0, 0.58, 0.125]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.025, 0.006, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#c0706a" />
        </mesh>
      </group>

      {/* Left arm */}
      <group ref={lArmRef} position={[-0.19, 0.28, 0]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.022, 0.32, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={rArmRef} position={[0.19, 0.28, 0]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.022, 0.32, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>

      {/* Dress sparkle glow */}
      <pointLight position={[0, 0.1, 0.2]} color={dressColor} intensity={0.5} distance={1.8} decay={2} />
    </group>
  );
}

// ── Crowd of 5 girls around the table ────────────────────────────────────────
function Crowd({ neons, cheering = false }) {
  const dresses = [
    neons[0], neons[1], neons[2 % neons.length],
    neons[0], neons[1],
  ];
  const hairs = ["#1a0600","#3d2010","#0a0508","#2a1a0a","#180808"];

  // Positions around the table, looking inward
  const crowd = [
    { pos: [-5.2, -1.35, 0.5],   rot: [0,  1.4, 0],  phase: 0    },
    { pos: [ 5.2, -1.35, 0.5],   rot: [0, -1.4, 0],  phase: 1.3  },
    { pos: [-3.8, -1.35, 4.2],   rot: [0,  0.5, 0],  phase: 2.1  },
    { pos: [ 3.8, -1.35, 4.2],   rot: [0, -0.5, 0],  phase: 0.8  },
    { pos: [  0,  -1.35, 5.5],   rot: [0,  Math.PI, 0], phase: 1.7 },
  ];

  return (
    <>
      {crowd.map((c, i) => (
        <CrowdGirl
          key={i}
          position={c.pos}
          rotation={c.rot}
          dressColor={dresses[i]}
          hairColor={hairs[i]}
          phase={c.phase}
          cheering={cheering}
        />
      ))}
    </>
  );
}

// ── Seated Player at Table ────────────────────────────────────────────────────
function SeatedPlayer({ position, rotation, bodyColor, accentColor, emoji, name, phase }) {
  const rootRef = useRef();
  const lArmRef = useRef();
  const rArmRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (!rootRef.current) return;
    // Subtle breathing animation
    rootRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.008;
    // Occasional look-around
    if (rootRef.current.children[0]) {
      rootRef.current.children[0].rotation.y = Math.sin(t * 0.3) * 0.2;
    }
    // Arms resting on table
    if (lArmRef.current) lArmRef.current.rotation.x = -0.6 + Math.sin(t * 0.8) * 0.04;
    if (rArmRef.current) rArmRef.current.rotation.x = -0.6 + Math.sin(t * 0.8) * 0.04;
  });

  const skin = "#f5c9a8";

  return (
    <group ref={rootRef} position={position} rotation={rotation}>
      {/* Chair back */}
      <mesh position={[0, 0.2, -0.28]}>
        <boxGeometry args={[0.52, 0.55, 0.06]} />
        <meshStandardMaterial color="#1a0800" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.1, -0.28]}>
        <boxGeometry args={[0.52, 0.06, 0.06]} />
        <meshStandardMaterial color="#1a0800" roughness={0.8} />
      </mesh>
      {/* Chair seat */}
      <mesh position={[0, -0.28, -0.1]}>
        <boxGeometry args={[0.5, 0.07, 0.42]} />
        <meshStandardMaterial color="#1a0800" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Chair legs */}
      {[[-0.22,-0.3],[0.22,-0.3],[-0.22,0.12],[0.22,0.12]].map(([x,z],i)=>(
        <mesh key={i} position={[x, -0.5, z]}>
          <cylinderGeometry args={[0.02,0.02,0.44,6]} />
          <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Torso */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.38, 10]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} emissive={bodyColor} emissiveIntensity={0.12} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.038, 0.044, 0.1, 8]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>

      {/* Head */}
      <group>
        <mesh position={[0, 0.38, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.44, -0.01]}>
          <sphereGeometry args={[0.14, 14, 14]} />
          <meshStandardMaterial color="#1a0600" roughness={0.92} />
        </mesh>

        {/* Avatar emoji name tag above head */}
        <Html position={[0, 0.38, 0]} center distanceFactor={4} zIndexRange={[1, 0]} occlude={false}>
          <div style={{
            background: `linear-gradient(135deg, ${bodyColor}dd, #000000cc)`,
            border: `1px solid ${accentColor}88`,
            borderRadius: 8,
            padding: "3px 7px",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
            boxShadow: `0 0 10px ${accentColor}44`,
            transform: "translateY(-36px)",
            pointerEvents: "none",
          }}>
            <span style={{ fontSize: 14 }}>{emoji}</span>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "sans-serif" }}>{name}</span>
          </div>
        </Html>
      </group>

      {/* Left arm — resting on table */}
      <group ref={lArmRef} position={[-0.18, 0.1, 0.12]} rotation={[-0.6, 0, -0.2]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.022, 0.3, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>

      {/* Right arm — resting on table */}
      <group ref={rArmRef} position={[0.18, 0.1, 0.12]} rotation={[-0.6, 0, 0.2]}>
        <mesh>
          <cylinderGeometry args={[0.028, 0.022, 0.3, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>

      {/* Accent glow */}
      <pointLight position={[0, 0.35, 0.15]} color={accentColor} intensity={0.4} distance={1.5} decay={2} />
    </group>
  );
}

// ── City skyline ──────────────────────────────────────────────────────────────
function Skyline({ neons }) {
  const buildings = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    x: (rng(i * 7 + 1) - 0.5) * 75,
    z: -20 - rng(i * 3 + 2) * 22,
    w: 0.5 + rng(i * 11 + 3) * 2.5,
    h: 2.5 + rng(i * 5 + 4) * 15,
    d: 0.5 + rng(i * 13 + 5) * 2,
    color: neons[i % neons.length],
    win: rng(i * 17 + 6),
  })), [neons.join(",")]);

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2 - 5, b.z]}>
          <mesh castShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#080808" emissive={b.color} emissiveIntensity={0.07 + b.win * 0.06} roughness={0.9} />
          </mesh>
          {/* Window grid */}
          {b.win > 0.5 && (
            <mesh position={[0, 0, b.d / 2 + 0.01]}>
              <planeGeometry args={[b.w * 0.85, b.h * 0.8]} />
              <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.15} transparent opacity={0.25} />
            </mesh>
          )}
          <pointLight position={[0, b.h / 2 + 0.2, 0]} color={b.color} intensity={0.6} distance={5} decay={2} />
        </group>
      ))}
    </group>
  );
}

// ── Floating card ─────────────────────────────────────────────────────────────
function FloatingCard({ x, y, z, color, delay, rotDir = 1 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + delay;
    ref.current.position.y = y + Math.sin(t * 0.4) * 0.35;
    ref.current.rotation.y = t * 0.18 * rotDir;
    ref.current.rotation.z = Math.sin(t * 0.3) * 0.12;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.88, 0.016]} />
        <meshStandardMaterial color="#f8f5ee" emissive="#ffffff" emissiveIntensity={0.04} roughness={0.3} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.1, 0.01]}>
        <boxGeometry args={[0.52, 0.64, 0.001]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
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
    ref.current.rotation.y += 0.009;
    ref.current.position.y = y + Math.sin(t * 0.45) * 0.18;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.23, 0.23, 0.072, 32]} />
        <meshStandardMaterial color={color} metalness={0.82} roughness={0.12} emissive={color} emissiveIntensity={0.28} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.21, 0.027, 8, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

// ── Ambient particles ─────────────────────────────────────────────────────────
function Particles({ count = 140, color }) {
  const ref = useRef();
  const { pos, col } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 32;
      pos[i*3+1] = Math.random() * 10 - 1.5;
      pos[i*3+2] = (Math.random() - 0.5) * 32;
      col[i*3]   = c.r + (Math.random() - 0.5) * 0.35;
      col[i*3+1] = c.g + (Math.random() - 0.5) * 0.35;
      col[i*3+2] = c.b + (Math.random() - 0.5) * 0.35;
    }
    return { pos, col };
  }, [count, color]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[col, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.75} sizeAttenuation />
    </points>
  );
}

// ── Spotlight beams from ceiling ─────────────────────────────────────────────
function SpotBeam({ x, z, color, delay }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.18 + delay;
    ref.current.rotation.y = t;
    ref.current.rotation.x = Math.sin(t * 0.7) * 0.15;
  });
  return (
    <group ref={ref} position={[x, 6, z]}>
      <mesh>
        <coneGeometry args={[0.06, 14, 8, 1, true]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={0.6} distance={8} decay={2} />
    </group>
  );
}

// ── Neon rings ────────────────────────────────────────────────────────────────
function GroundRings({ color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.elapsedTime * 0.04;
  });
  return (
    <group ref={ref} position={[0, -1.5, 0]} rotation={[-Math.PI/2, 0, 0]}>
      {[7, 12, 17].map((r, i) => (
        <mesh key={i}>
          <ringGeometry args={[r - 0.06, r + 0.06, 64]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28 - i * 0.07} transparent opacity={0.45 - i * 0.1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Main scene ────────────────────────────────────────────────────────────────
function Scene({ config, cheering, players = [] }) {
  const { sky, neons, fogDist } = config;
  const [n0, n1, n2] = neons;

  const floatingCards = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: (rng(i * 11 + 1) - 0.5) * 13,
    y: 0.6 + rng(i * 7 + 2) * 2,
    z: -3 - rng(i * 5 + 3) * 8,
    color: neons[i % neons.length],
    delay: i * 0.9,
    rotDir: i % 2 === 0 ? 1 : -1,
  })), [neons.join(",")]);

  const chips = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    x: (rng(i * 13 + 4) - 0.5) * 11,
    y: rng(i * 9 + 5) * 1.2 - 0.5,
    z: -2 - rng(i * 7 + 6) * 6,
    color: neons[i % neons.length],
    delay: i * 0.65,
  })), [neons.join(",")]);

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 14, fogDist]} />

      {/* Lighting */}
      <ambientLight intensity={0.18} color={n0} />
      <pointLight position={[0, 8, 0]}    intensity={3.5}  color={n1}       distance={40} decay={2} />
      <pointLight position={[-12, 5, -4]} intensity={2.2}  color={n0}       distance={28} decay={2} />
      <pointLight position={[ 12, 5, -4]} intensity={2.2}  color={n2 ?? n0} distance={28} decay={2} />
      <pointLight position={[0,   2,  6]} intensity={2.0}  color={n1}       distance={18} decay={2} />
      {/* Table fill light */}
      <pointLight position={[0,   2,  0.5]} intensity={3.0} color="#ffffff"  distance={10} decay={2} />

      {/* Spotbeams */}
      <SpotBeam x={-3} z={-2} color={n0} delay={0}   />
      <SpotBeam x={ 3} z={-2} color={n1} delay={2.1} />
      <SpotBeam x={ 0} z={ 2} color={n2 ?? n0} delay={4.2} />

      {/* Stars */}
      <Stars radius={90} depth={45} count={2800} factor={3.8} fade speed={0.35} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.3, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050d08" roughness={0.99} />
      </mesh>

      {/* Casino table */}
      <CasinoTable neons={neons} />

      {/* Crowd */}
      <Crowd neons={neons} cheering={cheering} />

      {/* Seated players at table */}
      {players.slice(0, 4).map((player, i) => {
        // Seat positions around the table (relative to table center at [0, -1.35, 0.5])
        const seats = [
          { pos: [0,    -0.88,  3.8], rot: [0, Math.PI,  0] },  // Front (player 0 / you)
          { pos: [-3.8, -0.88,  0.5], rot: [0,  1.55, 0] },     // Left
          { pos: [0,    -0.88, -2.8], rot: [0,  0,    0] },     // Back
          { pos: [ 3.8, -0.88,  0.5], rot: [0, -1.55, 0] },    // Right
        ];
        const seat = seats[i];
        const av = getAvatar(player.avatar ?? 15);
        return (
          <SeatedPlayer
            key={player.id ?? i}
            position={seat.pos}
            rotation={seat.rot}
            bodyColor={av.color || "#1a0a2e"}
            accentColor={av.accent || "#ffd700"}
            emoji={av.emoji}
            name={player.name}
            phase={i * 1.3}
          />
        );
      })}

      {/* City skyline */}
      <Skyline neons={neons} />

      {/* Floating cards */}
      {floatingCards.map((c, i) => <FloatingCard key={i} {...c} />)}

      {/* Chips */}
      {chips.map((c, i) => <Chip key={i} {...c} />)}

      {/* Particles */}
      <Particles count={120} color={n0} />

      {/* Neon rings */}
      <GroundRings color={n0} />
    </>
  );
}

// ── Cinematic camera ─────────────────────────────────────────────────────────
function CinematicCamera() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    // Slow breathing + drift
    camera.position.x = Math.sin(t * 0.035) * 1.2;
    camera.position.y = 2.2 + Math.sin(t * 0.05) * 0.45;
    camera.position.z = 8.5 + Math.sin(t * 0.028) * 0.6;
    camera.lookAt(0, -0.3, 0);
  });
  return null;
}

// ── Public export ─────────────────────────────────────────────────────────────
export default function CasinoBackground({ city = "lasvegas", cheering = false, players = [] }) {
  const config = CITY_CONFIGS[city] ?? CITY_CONFIGS.lasvegas;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <Canvas
        shadows
        camera={{ position: [0, 2.2, 8.5], fov: 52, near: 0.1, far: 250 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene config={config} cheering={cheering} players={players} />
          <CinematicCamera />
        </Suspense>
      </Canvas>
    </div>
  );
}
