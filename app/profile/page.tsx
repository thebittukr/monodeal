"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";

interface ProfileData {
  user: { id: string; email: string; name: string };
  profile: { username: string; countryCode: string | null; level: number; xp: number; equippedGirlfriendId: string | null } | null;
  rating: { eloRating: number; tier: string; gamesPlayed: number; gamesWon: number; winStreak: number; bestStreak: number; totalEarnings: number } | null;
  credits: { balance: number; locked: number } | null;
  equippedDate: { name: string; rarity: string; thumbnailUrl: string | null } | null;
}

const TIER_DISPLAY: Record<string, { label: string; color: string }> = {
  bronze: { label: "Bronze", color: "text-amber-700" },
  silver: { label: "Silver", color: "text-slate-300" },
  gold: { label: "Gold", color: "text-amber-400" },
  platinum: { label: "Platinum", color: "text-cyan-300" },
  diamond: { label: "Diamond", color: "text-violet-300" },
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user) {
          setData(d);
          setUsername(d.profile?.username || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMsg("Saved!");
      setEditing(false);
      // Refresh
      const fresh = await fetch("/api/profile").then(r => r.json());
      setData(fresh);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading...</div>;
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-center p-8">
        <div>
          <h2 className="text-xl font-bold mb-2">Sign in required</h2>
          <a href="/login" className="text-violet-400 hover:underline">Sign in to view your profile</a>
        </div>
      </div>
    );
  }

  const { user, profile, rating, credits, equippedDate } = data;
  const tier = TIER_DISPLAY[rating?.tier || "bronze"] || TIER_DISPLAY.bronze;
  const winRate = rating && rating.gamesPlayed > 0 ? Math.round((rating.gamesWon / rating.gamesPlayed) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Nav />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-2xl font-black text-white">
            {(profile?.username || user.name || "?")[0].toUpperCase()}
          </div>
          <div>
            {editing ? (
              <div className="flex items-center gap-2">
                <input value={username} onChange={(e) => setUsername(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm w-40 focus:border-violet-500 focus:outline-none"
                  maxLength={20} />
                <button onClick={saveProfile} disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold">{saving ? "..." : "Save"}</button>
                <button onClick={() => { setEditing(false); setUsername(profile?.username || ""); }}
                  className="text-slate-500 text-xs">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">{profile?.username || user.name}</h1>
                <button onClick={() => setEditing(true)} className="text-slate-600 hover:text-white text-xs transition">Edit</button>
              </div>
            )}
            <p className="text-slate-500 text-xs">{user.email}</p>
            {msg && <p className={`text-xs mt-1 ${msg === "Saved!" ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="ELO Rating" value={rating?.eloRating || 1000} />
          <Stat label="Tier" value={tier.label} className={tier.color} />
          <Stat label="Games" value={rating?.gamesPlayed || 0} />
          <Stat label="Win Rate" value={`${winRate}%`} className={winRate >= 50 ? "text-emerald-400" : "text-red-400"} />
          <Stat label="Wins" value={rating?.gamesWon || 0} />
          <Stat label="Win Streak" value={rating?.winStreak || 0} />
          <Stat label="Best Streak" value={rating?.bestStreak || 0} />
          <Stat label="Earnings" value={rating?.totalEarnings || 0} />
        </div>

        {/* Credits */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Credits</div>
              <div className="text-2xl font-black text-white">{credits?.balance?.toLocaleString() || 0}</div>
              {(credits?.locked || 0) > 0 && <div className="text-amber-400 text-xs">{credits?.locked} locked in game</div>}
            </div>
            <a href="/credits" className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">Manage</a>
          </div>
        </div>

        {/* Equipped Date */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Your Date</div>
              {equippedDate ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white font-bold">{equippedDate.name}</span>
                  <span className="text-xs text-violet-400 capitalize">{equippedDate.rarity}</span>
                </div>
              ) : (
                <div className="text-slate-600 text-sm mt-1">No date equipped</div>
              )}
            </div>
            <a href="/partners" className="px-4 py-2 rounded-lg bg-pink-600/20 border border-pink-500/20 text-pink-300 text-xs font-bold hover:bg-pink-600/30 transition">
              {equippedDate ? "Change" : "Choose Date"}
            </a>
          </div>
        </div>

        {/* Level */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Level {profile?.level || 1}</span>
            <span className="text-slate-600 text-[10px]">{profile?.xp || 0} XP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/30">
            <div className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" style={{ width: `${Math.min(100, ((profile?.xp || 0) % 1000) / 10)}%` }} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <a href="/responsible-gaming" className="block px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 text-slate-400 text-sm transition">
            Responsible Gaming Settings
          </a>
          <a href="/security" className="block px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 text-slate-400 text-sm transition">
            Security & Privacy
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className = "text-white" }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3">
      <div className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">{label}</div>
      <div className={`text-lg font-black ${className}`}>{value}</div>
    </div>
  );
}
