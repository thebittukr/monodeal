"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CasinoBackground from "@/components/CasinoBackground";
import { CITY_CONFIGS } from "@/components/CasinoBackground";
import AvatarPicker from "@/components/AvatarPicker";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";

const COLOR_PILLS = [
  { color: "#ef4444" }, { color: "#3b82f6" }, { color: "#22c55e" },
  { color: "#eab308" }, { color: "#a855f7" }, { color: "#f97316" },
];

export default function HomePage() {
  const router = useRouter();
  const [tab,        setTab]        = useState("create");
  const [name,       setName]       = useState("");
  const [roomId,     setRoomId]     = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState("");
  const [activeGame, setActiveGame] = useState(null); // { roomId, playerId, phase }
  const [city,       setCity]       = useState("lasvegas");
  const [avatarId,   setAvatarId]   = useState(DEFAULT_AVATAR_ID);

  // ── Check localStorage for an active game to rejoin ─────────────────────
  useEffect(() => {
    const entries = Object.entries(localStorage)
      .filter(([k]) => k.startsWith("pr_") && k.endsWith("_pid"));

    if (entries.length === 0) return;

    // Check the most recent stored room (could be multiple; check all briefly)
    (async () => {
      for (const [key, playerId] of entries) {
        const roomId = key.slice(3, -4); // pr_ROOMID_pid
        try {
          const res = await fetch(`/api/game?roomId=${roomId}&playerId=${playerId}`, { cache: "no-store" });
          if (!res.ok) {
            // Room gone — clean up stale key
            localStorage.removeItem(key);
            continue;
          }
          const data = await res.json();
          if (data.phase === "ended") {
            localStorage.removeItem(key);
            continue;
          }
          // Found a live game
          setActiveGame({ roomId, playerId, phase: data.phase });
          return;
        } catch { /* ignore */ }
      }
      const savedCity = localStorage.getItem("pr_city");
      if (savedCity && CITY_CONFIGS[savedCity]) setCity(savedCity);
      const savedAvatar = localStorage.getItem("pr_avatar");
      if (savedAvatar) setAvatarId(parseInt(savedAvatar));
    })();
  }, []);

  async function handleCreate() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    setErr(""); setLoading(true);
    localStorage.setItem("pr_avatar", avatarId.toString());
    try {
      const res  = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createRoom", playerName: name.trim(), maxPlayers, avatarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      localStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      router.push(`/room/${data.roomId}`);
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  async function handleSolo() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    setErr(""); setLoading(true);
    localStorage.setItem("pr_avatar", avatarId.toString());
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createSoloRoom", playerName: name.trim(), avatarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      localStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      router.push(`/room/${data.roomId}`);
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  async function handleJoin() {
    if (!name.trim())   { setErr("Enter your name first"); return; }
    if (!roomId.trim()) { setErr("Enter a room code"); return; }
    setErr(""); setLoading(true);
    localStorage.setItem("pr_avatar", avatarId.toString());
    const code = roomId.trim().toUpperCase();
    try {
      const res  = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "joinRoom", roomId: code, playerName: name.trim(), avatarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${code}_pid`, data.playerId);
      localStorage.setItem(`pr_${code}_pid`, data.playerId);
      router.push(`/room/${code}`);
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  return (
    <div className="min-h-full flex flex-col relative">
      <CasinoBackground city={city} />
      <div className="relative z-10 flex flex-col min-h-full">
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
        {/* City background selector */}
        <div className="w-full max-w-sm mb-4">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 text-center">🌆 Casino Scene</div>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(CITY_CONFIGS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => { setCity(key); localStorage.setItem("pr_city", key); }}
                className={`px-2 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  city === key
                    ? "bg-indigo-600/80 border-indigo-400/60 text-white"
                    : "bg-slate-800/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rejoin banner */}
        {activeGame && (
          <div className="w-full max-w-sm mb-4 bg-emerald-900/50 border border-emerald-500/40 rounded-2xl px-5 py-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-emerald-300 font-bold text-sm">Active game found</div>
              <div className="text-emerald-400/70 text-xs font-mono mt-0.5">Room: {activeGame.roomId} · {activeGame.phase}</div>
            </div>
            <button
              onClick={() => {
                sessionStorage.setItem(`pr_${activeGame.roomId}_pid`, activeGame.playerId);
                router.push(`/room/${activeGame.roomId}`);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
            >
              Rejoin →
            </button>
          </div>
        )}
        <div className="w-full max-w-sm bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-6">
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

          {/* Avatar picker */}
          <div className="mb-4">
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Your Avatar</label>
            <AvatarPicker
              selected={avatarId}
              onSelect={(id) => { setAvatarId(id); localStorage.setItem("pr_avatar", id.toString()); }}
            />
          </div>

          {tab === "create" && (
            <>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Number of Players</label>
              <div className="flex gap-2 mb-4">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                      maxPlayers === n
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {n} Players
                  </button>
                ))}
              </div>
            </>
          )}

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
          <button
            onClick={handleSolo}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-sm transition-all duration-150 shadow-lg mt-2"
          >
            {loading ? "Loading…" : "⚡ Play Solo vs 3 Bots"}
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
