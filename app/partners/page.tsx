"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";

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
  rare: { bg: "bg-blue-900/20", border: "border-blue-500/30", text: "text-blue-400", glow: "shadow-blue-500/5" },
  epic: { bg: "bg-purple-900/20", border: "border-purple-500/30", text: "text-purple-400", glow: "shadow-purple-500/10" },
  legendary: { bg: "bg-amber-900/20", border: "border-amber-500/30", text: "text-amber-400", glow: "shadow-amber-500/15" },
};

export default function PartnersPage() {
  const { user, isAdmin } = useAuth();
  const [girlfriends, setGirlfriends] = useState<Girlfriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [selected, setSelected] = useState<Girlfriend | null>(null);

  useEffect(() => {
    fetch("/api/girlfriends?view=shop")
      .then((r) => r.json())
      .then((data) => { setGirlfriends(data.girlfriends || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = girlfriends
    .filter(g => filter === "all" || g.rarity === filter)
    .filter(g => genderFilter === "all" || g.gender === genderFilter);

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

        {/* Sign up CTA for anonymous users */}
        {!user && (
          <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-500/20 rounded-2xl p-5 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm mb-1">Create an account for extra benefits</h3>
                <ul className="text-slate-400 text-xs space-y-1">
                  <li>Get 4 free starter dates immediately</li>
                  <li>Save your collection across devices</li>
                  <li>Appear on the leaderboard</li>
                  <li>Play credits rooms and win real rewards</li>
                  <li>Track your stats, ELO rating, and win streaks</li>
                </ul>
              </div>
              <a href="/signup" className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-violet-600/20 shrink-0">
                Create Account
              </a>
            </div>
          </div>
        )}

        {/* Gender Filter */}
        <div className="flex gap-2 mb-3">
          {[
            { key: "all", label: "All Dates" },
            { key: "female", label: "Girlfriends" },
            { key: "male", label: "Boyfriends" },
          ].map((g) => (
            <button key={g.key} onClick={() => setGenderFilter(g.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                genderFilter === g.key ? "bg-pink-600 border-pink-500 text-white" : "bg-black/20 border-white/5 text-slate-500 hover:text-white"
              }`}>
              {g.label}
            </button>
          ))}
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
              return (
                <button key={gf.id} onClick={() => setSelected(gf)}
                  className={`${rc.bg} border ${rc.border} rounded-2xl p-3 sm:p-4 text-left hover:scale-[1.02] transition-all group shadow-lg ${rc.glow}`}>
                  {/* Static card — NO WebGL, just styled placeholder */}
                  <div className="aspect-square bg-gradient-to-b from-slate-700/30 to-black/40 rounded-xl mb-3 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                    {gf.thumbnailUrl ? (
                      <img src={gf.thumbnailUrl} alt={gf.name} className="w-full h-full object-contain" style={{}} />
                    ) : (
                      <img src="/dates/crimson.png" alt="" className="w-full h-full object-contain opacity-80" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition">{gf.name}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${rc.text}`}>{gf.rarity}</span>
                        <span className="text-[9px]">{gf.gender === "male" ? "♂" : "♀"}</span>
                      </div>
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

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* 3D Model (dynamically loaded) */}
            <div className="w-full aspect-square bg-black/50 rounded-t-2xl overflow-hidden relative">
              {selected.thumbnailUrl ? (
                <img src={selected.thumbnailUrl} alt={selected.name} className="w-full h-full object-contain" />
              ) : (
                <img src="/dates/crimson.png" alt="" className="w-full h-full object-contain" />
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

              {selected.personality && <p className="text-violet-300 text-sm italic mb-2">&ldquo;{selected.personality}&rdquo;</p>}
              {selected.description && <p className="text-slate-400 text-sm mb-2">{selected.description}</p>}
              {selected.backstory && <p className="text-slate-600 text-xs leading-relaxed mb-4">{selected.backstory}</p>}

              {user ? (
                <DateActions girlfriend={selected} onDone={() => { setSelected(null); fetch("/api/girlfriends?view=shop").then(r => r.json()).then(d => setGirlfriends(d.girlfriends || [])); }} />
              ) : (
                <a href="/signup" className="block w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm text-center transition shadow-lg shadow-violet-500/15">
                  Sign up to claim dates
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Date Actions ─────────────────────────────────────────────────────────────

function DateActions({ girlfriend, onDone }: { girlfriend: Girlfriend; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleBuy() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/girlfriends", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy", girlfriendId: girlfriend.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message || "Claimed!");
      setTimeout(onDone, 1500);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally { setLoading(false); }
  }

  async function handleEquip() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/girlfriends", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "equip", girlfriendId: girlfriend.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg("Equipped!");
      setTimeout(onDone, 1000);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button onClick={handleBuy} disabled={loading}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50 ${
            girlfriend.isStarter
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/15"
          }`}>
          {loading ? "..." : girlfriend.isStarter ? "Claim Free" : `Buy for ${girlfriend.priceCredits} credits`}
        </button>
        <button onClick={handleEquip} disabled={loading}
          className="px-4 py-3 rounded-xl bg-pink-600/20 border border-pink-500/20 text-pink-300 font-bold text-sm hover:bg-pink-600/30 transition disabled:opacity-50">
          Equip
        </button>
      </div>
      {msg && <p className={`text-xs mt-2 text-center ${msg.includes("!") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
    </div>
  );
}
