"use client";

import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [dates, setDates] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // New date form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", rarity: "common", style: "anime", gender: "female", priceCredits: 200, description: "", personality: "", backstory: "", modelUrl: "", thumbnailUrl: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [statsRes, datesRes] = await Promise.all([
        fetch("/api/admin/stats").then(r => r.json()),
        fetch("/api/admin/girlfriends").then(r => r.json()),
      ]);
      if (statsRes.error) { setError(statsRes.error); setLoading(false); return; }
      setStats(statsRes);
      setDates(datesRes.girlfriends || []);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }

  async function saveDate() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/girlfriends", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setShowForm(false);
      setForm({ name: "", rarity: "common", style: "anime", gender: "female", priceCredits: 200, description: "", personality: "", backstory: "", modelUrl: "", thumbnailUrl: "" });
      loadData();
    } catch (e) { alert((e as Error).message); }
    setSaving(false);
  }

  async function deleteDate(id: string) {
    if (!confirm("Delete this date?")) return;
    await fetch("/api/admin/girlfriends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    loadData();
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading admin...</div>;
  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400 text-center p-8">
      <div><h2 className="text-xl font-bold mb-2">Access Denied</h2><p className="text-sm">{error}</p><a href="/" className="text-violet-400 text-sm mt-4 block">Back to game</a></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">PropertyRush Management</p>
          </div>
          <a href="/" className="text-slate-500 hover:text-white text-sm transition">&larr; Game</a>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            <StatCard label="Players" value={stats.players} />
            <StatCard label="Games" value={stats.games} />
            <StatCard label="Revenue" value={`${stats.revenue} cr`} color="text-emerald-400" />
            <StatCard label="Dates" value={stats.girlfriends} />
            <StatCard label="Fraud Flags" value={stats.fraudFlags} color={stats.fraudFlags > 0 ? "text-red-400" : "text-slate-400"} />
          </div>
        )}

        {/* Dates Management */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Dates ({dates.length})</h2>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">
              {showForm ? "Cancel" : "+ Add Date"}
            </button>
          </div>

          {showForm && (
            <div className="bg-black/20 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
                <Select label="Rarity" value={form.rarity} onChange={v => setForm({ ...form, rarity: v })} options={["common","rare","epic","legendary"]} />
                <Select label="Style" value={form.style} onChange={v => setForm({ ...form, style: v })} options={["anime","realistic","fantasy","cyberpunk","casual"]} />
                <Select label="Gender" value={form.gender} onChange={v => setForm({ ...form, gender: v })} options={["female","male"]} />
                <Input label="Price (credits)" value={String(form.priceCredits)} onChange={v => setForm({ ...form, priceCredits: parseInt(v) || 0 })} type="number" />
                <Input label="Model URL" value={form.modelUrl} onChange={v => setForm({ ...form, modelUrl: v })} placeholder="/models/xxx.glb" />
              </div>
              <Input label="Thumbnail URL" value={form.thumbnailUrl} onChange={v => setForm({ ...form, thumbnailUrl: v })} placeholder="https://..." />
              <Input label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
              <Input label="Personality" value={form.personality} onChange={v => setForm({ ...form, personality: v })} placeholder='e.g. "The Hype Queen — maximum energy"' />
              <Input label="Backstory" value={form.backstory} onChange={v => setForm({ ...form, backstory: v })} />
              <button onClick={saveDate} disabled={saving || !form.name} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition disabled:opacity-50">
                {saving ? "Saving..." : "Create Date"}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {dates.map((d: Record<string, unknown>) => (
              <div key={d.id as string} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg shrink-0">
                  {(d.gender as string) === "female" ? "👩" : "👨"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm truncate">{d.name as string}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      d.rarity === "legendary" ? "bg-amber-500/20 text-amber-400" :
                      d.rarity === "epic" ? "bg-purple-500/20 text-purple-400" :
                      d.rarity === "rare" ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"
                    }`}>{d.rarity as string}</span>
                    {d.isStarter && <span className="text-emerald-400 text-[9px] font-bold">FREE</span>}
                  </div>
                  <div className="text-slate-600 text-[10px] truncate">{(d.personality as string) || "No personality set"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-amber-400 font-bold">{(d.priceCredits as number) || 0} cr</div>
                  <div className="text-[9px] text-slate-600">{d.totalEquipped as number} equipped</div>
                </div>
                <button onClick={() => deleteDate(d.id as string)} className="text-slate-700 hover:text-red-400 text-xs transition px-2">Del</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3">
      <div className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">{label}</div>
      <div className={`text-xl font-black ${color}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 focus:outline-none" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 focus:outline-none">
        {options.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
      </select>
    </div>
  );
}
