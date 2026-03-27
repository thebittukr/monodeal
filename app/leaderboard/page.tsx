"use client";

import { useState, useEffect } from "react";

interface RankedPlayer {
  rank: number;
  userId: string;
  username: string | null;
  eloRating: number;
  tier: string;
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  bestStreak: number;
  totalEarnings: number;
}

const TIER_CONFIG: Record<string, { color: string; icon: string }> = {
  bronze: { color: "text-amber-700", icon: "🥉" },
  silver: { color: "text-slate-300", icon: "🥈" },
  gold: { color: "text-amber-400", icon: "🥇" },
  platinum: { color: "text-cyan-300", icon: "💎" },
  diamond: { color: "text-violet-300", icon: "👑" },
};

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<RankedPlayer[]>([]);
  const [tab, setTab] = useState("elo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings(tab);
  }, [tab]);

  async function loadRankings(type: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?type=${type}&limit=50`);
      const data = await res.json();
      setRankings(data.rankings || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-black">P</div>
          <span className="text-white font-bold hidden sm:block">Property<span className="text-violet-400">Rush</span></span>
        </a>
        <div className="flex items-center gap-2">
          <a href="/partners" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition">Dates</a>
          <a href="/credits" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition">Credits</a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl sm:text-3xl font-black mb-1">Leaderboard</h1>
        <p className="text-slate-500 text-sm mb-6">Top players ranked by skill</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-black/30 rounded-xl p-1 mb-6">
          {[
            { key: "elo", label: "Skill Rating" },
            { key: "wins", label: "Most Wins" },
            { key: "earnings", label: "Top Earners" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
                tab === t.key ? "bg-violet-600 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading rankings...</div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-slate-400 font-semibold">No players ranked yet</div>
            <div className="text-slate-600 text-sm mt-1">Play games to appear on the leaderboard</div>
            <a href="/" className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition">
              Play Now
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 Podium */}
            {rankings.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[rankings[1], rankings[0], rankings[2]].map((p, i) => {
                  const place = [2, 1, 3][i];
                  const height = ["h-24", "h-32", "h-20"][i];
                  const tierCfg = TIER_CONFIG[p.tier] || TIER_CONFIG.bronze;
                  return (
                    <div key={p.userId} className="flex flex-col items-center">
                      <div className="text-xs text-slate-500 font-bold mb-1">#{place}</div>
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                        place === 1 ? "from-amber-400 to-amber-600" : place === 2 ? "from-slate-300 to-slate-500" : "from-amber-600 to-amber-800"
                      } flex items-center justify-center text-sm font-black text-white mb-2`}>
                        {(p.username || "?")[0].toUpperCase()}
                      </div>
                      <div className="text-xs font-bold text-white truncate max-w-full">{p.username || "Anonymous"}</div>
                      <div className={`text-[10px] ${tierCfg.color}`}>{tierCfg.icon} {p.eloRating}</div>
                      <div className={`${height} w-full bg-gradient-to-t ${
                        place === 1 ? "from-amber-600/20 to-amber-400/5" : place === 2 ? "from-slate-500/20 to-slate-300/5" : "from-amber-800/20 to-amber-600/5"
                      } rounded-t-xl mt-2 border-t ${
                        place === 1 ? "border-amber-400/30" : place === 2 ? "border-slate-400/30" : "border-amber-600/30"
                      }`} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Rankings Table */}
            {rankings.map((p, i) => {
              const tierCfg = TIER_CONFIG[p.tier] || TIER_CONFIG.bronze;
              return (
                <div key={p.userId} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                  i < 3 ? "bg-amber-900/10 border-amber-500/15" : "bg-slate-900/50 border-white/5 hover:border-white/10"
                }`}>
                  <div className={`w-8 text-center font-bold text-sm ${i < 3 ? "text-amber-400" : "text-slate-600"}`}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {(p.username || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{p.username || "Anonymous"}</div>
                    <div className={`text-[10px] ${tierCfg.color}`}>{tierCfg.icon} {p.tier?.toUpperCase()}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-white">
                      {tab === "elo" ? p.eloRating : tab === "wins" ? p.gamesWon : p.totalEarnings.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tab === "elo" ? "ELO" : tab === "wins" ? "wins" : "credits"}
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-xs text-slate-500">{p.gamesPlayed} games</div>
                    <div className="text-[10px] text-slate-600">{p.gamesPlayed > 0 ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0}% win</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
