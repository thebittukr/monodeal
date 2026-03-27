"use client";

import { useState, useEffect } from "react";

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
                  {/* Model placeholder */}
                  <div className="aspect-[3/4] bg-black/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <div className="text-4xl opacity-30">{gf.gender === "female" ? "👩" : "👨"}</div>
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

            <div className="aspect-[3/4] bg-black/30 rounded-xl mb-4 flex items-center justify-center">
              <div className="text-6xl opacity-30">{selected.gender === "female" ? "👩" : "👨"}</div>
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
