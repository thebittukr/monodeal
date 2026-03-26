"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR_PILLS = [
  { color: "#ef4444", label: "Red"    },
  { color: "#3b82f6", label: "Blue"   },
  { color: "#22c55e", label: "Green"  },
  { color: "#eab308", label: "Yellow" },
  { color: "#a855f7", label: "Purple" },
  { color: "#f97316", label: "Orange" },
];

export default function HomePage() {
  const router = useRouter();
  const [tab,     setTab]     = useState("create"); // "create" | "join"
  const [name,    setName]    = useState("");
  const [roomId,  setRoomId]  = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handleCreate() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    setErr("");
    setLoading(true);
    try {
      const res  = await fetch("/api/createRoom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      localStorage.setItem(`pr_${data.roomId}_name`, name.trim());
      router.push(`/room/${data.roomId}`);
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    if (!roomId.trim()) { setErr("Enter a room code"); return; }
    setErr("");
    setLoading(true);
    const code = roomId.trim().toUpperCase();
    try {
      const res  = await fetch("/api/joinRoom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: code, playerName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`pr_${code}_pid`, data.playerId);
      localStorage.setItem(`pr_${code}_name`, name.trim());
      router.push(`/room/${code}`);
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full felt-bg flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-12 pb-6 px-4 text-center">
        {/* Color dots decorative */}
        <div className="flex gap-2 mb-6">
          {COLOR_PILLS.map((p) => (
            <div
              key={p.label}
              className="w-3 h-3 rounded-full opacity-80"
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white leading-none">
          Property<span className="text-indigo-400">Rush</span>
        </h1>
        <p className="text-slate-400 text-base mt-3 max-w-xs">
          The fast property trading card game.<br />
          Collect 3 sets before your opponent does.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 mt-5 justify-center">
          {["2–4 Players", "~15 min", "Strategy + Luck", "No signup"].map((f) => (
            <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-sm bg-slate-800/80 backdrop-blur border border-white/10 rounded-3xl shadow-2xl p-6">

          {/* Tab Switch */}
          <div className="flex rounded-2xl bg-slate-900/60 p-1 mb-6 gap-1">
            <TabBtn active={tab === "create"} onClick={() => { setTab("create"); setErr(""); }}>
              Create Room
            </TabBtn>
            <TabBtn active={tab === "join"} onClick={() => { setTab("join"); setErr(""); }}>
              Join Room
            </TabBtn>
          </div>

          {/* Name input (shared) */}
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
            placeholder="e.g. Alex"
            maxLength={20}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all mb-4"
          />

          {/* Room code input (join only) */}
          {tab === "join" && (
            <>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Room Code
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="e.g. ABC123"
                maxLength={6}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all mb-4"
              />
            </>
          )}

          {/* Error */}
          {err && (
            <div className="mb-4 px-4 py-2 rounded-xl bg-red-900/50 border border-red-500/30 text-red-300 text-sm">
              ⚠ {err}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={tab === "create" ? handleCreate : handleJoin}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-base transition-all duration-150 shadow-lg shadow-indigo-500/20"
          >
            {loading
              ? "Loading…"
              : tab === "create"
              ? "Create Room +"
              : "Join Game →"
            }
          </button>
        </div>

        {/* How to play */}
        <div className="w-full max-w-sm mt-6">
          <HowToPlay />
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="text-center py-4 px-4 text-slate-600 text-xs border-t border-white/5">
        This is a prototype demo. Not affiliated with any brand. No real-money gameplay.
      </footer>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150
        ${active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-400 hover:text-white"
        }
      `}
    >
      {children}
    </button>
  );
}

function HowToPlay() {
  const steps = [
    { icon: "🃏", text: "Draw 2 cards at the start of your turn" },
    { icon: "🏠", text: "Play up to 3 cards — properties, money, or actions" },
    { icon: "🏆", text: "First to complete 3 full property sets wins!" },
    { icon: "🚫", text: "Play Just Say No to cancel any action against you" },
  ];

  return (
    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
      <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">How to Play</h3>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">{s.icon}</span>
            <span className="text-slate-400 text-xs leading-relaxed">{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
