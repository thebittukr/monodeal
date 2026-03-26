"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR_PILLS = [
  { color: "#ef4444" }, { color: "#3b82f6" }, { color: "#22c55e" },
  { color: "#eab308" }, { color: "#a855f7" }, { color: "#f97316" },
];

export default function HomePage() {
  const router = useRouter();
  const [tab,     setTab]     = useState("create");
  const [name,    setName]    = useState("");
  const [roomId,  setRoomId]  = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handleCreate() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    setErr(""); setLoading(true);
    try {
      const res  = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createRoom", playerName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      router.push(`/room/${data.roomId}`);
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  async function handleJoin() {
    if (!name.trim())   { setErr("Enter your name first"); return; }
    if (!roomId.trim()) { setErr("Enter a room code"); return; }
    setErr(""); setLoading(true);
    const code = roomId.trim().toUpperCase();
    try {
      const res  = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "joinRoom", roomId: code, playerName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${code}_pid`, data.playerId);
      router.push(`/room/${code}`);
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  return (
    <div className="min-h-full felt-bg flex flex-col">
      <div className="flex flex-col items-center pt-12 pb-6 px-4 text-center">
        <div className="flex gap-2 mb-6">
          {COLOR_PILLS.map((p, i) => (
            <div key={i} className="w-3 h-3 rounded-full opacity-80" style={{ backgroundColor: p.color }} />
          ))}
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white leading-none">
          Property<span className="text-indigo-400">Rush</span>
        </h1>
        <p className="text-slate-400 text-base mt-3 max-w-xs">
          The fast property trading card game.<br />
          Collect 3 sets before your opponents do.
        </p>
        <div className="flex flex-wrap gap-2 mt-5 justify-center">
          {["2–4 Players", "~15 min", "Strategy + Luck", "No signup"].map((f) => (
            <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium">{f}</span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-sm bg-slate-800/80 backdrop-blur border border-white/10 rounded-3xl shadow-2xl p-6">
          <div className="flex rounded-2xl bg-slate-900/60 p-1 mb-6 gap-1">
            <TabBtn active={tab === "create"} onClick={() => { setTab("create"); setErr(""); }}>Create Room</TabBtn>
            <TabBtn active={tab === "join"}   onClick={() => { setTab("join");   setErr(""); }}>Join Room</TabBtn>
          </div>

          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Your Name</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
            placeholder="e.g. Alex" maxLength={20}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all mb-4"
          />

          {tab === "join" && (
            <>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Room Code</label>
              <input
                type="text" value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="e.g. ABC123" maxLength={6}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all mb-4"
              />
            </>
          )}

          {err && (
            <div className="mb-4 px-4 py-2 rounded-xl bg-red-900/50 border border-red-500/30 text-red-300 text-sm">⚠ {err}</div>
          )}

          <button
            onClick={tab === "create" ? handleCreate : handleJoin}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-base transition-all duration-150 shadow-lg shadow-indigo-500/20"
          >
            {loading ? "Loading…" : tab === "create" ? "Create Room +" : "Join Game →"}
          </button>
        </div>

        <div className="w-full max-w-sm mt-6">
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">How to Play</h3>
            <div className="space-y-2">
              {[
                ["🃏", "Draw 2 cards at the start of your turn"],
                ["🏠", "Play up to 3 cards — properties, money, or actions"],
                ["🏆", "First to complete 3 full property sets wins!"],
                ["🚫", "Play Just Say No to cancel any action against you"],
              ].map(([icon, text], i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <span className="text-slate-400 text-xs leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
        active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
