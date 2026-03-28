"use client";

import { useState, useEffect } from "react";

type Tab = "overview" | "players" | "transactions" | "games" | "fraud" | "dates" | "bots";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-sm font-black">A</div>
          <span className="font-bold">Admin Dashboard</span>
        </div>
        <a href="/" className="text-slate-500 hover:text-white text-xs transition">&larr; Game</a>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5 px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar">
        {(["overview","players","transactions","games","fraud","dates","bots"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition ${
              tab === t ? "border-violet-500 text-white" : "border-transparent text-slate-600 hover:text-slate-400"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 mb-4 text-xs">{error}</div>}
        {tab === "overview" && <OverviewTab onError={setError} />}
        {tab === "players" && <PlayersTab onError={setError} />}
        {tab === "transactions" && <TransactionsTab onError={setError} />}
        {tab === "games" && <GamesTab onError={setError} />}
        {tab === "fraud" && <FraudTab onError={setError} />}
        {tab === "dates" && <DatesTab onError={setError} />}
        {tab === "bots" && <BotsTab onError={setError} />}
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ onError }: { onError: (e: string) => void }) {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(d => d.error ? onError(d.error) : setStats(d)).catch(e => onError(e.message));
  }, []);
  if (!stats) return <Loading />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <Stat label="Players" value={stats.players} />
      <Stat label="Games" value={stats.games} />
      <Stat label="Revenue" value={`${stats.revenue} cr`} color="text-emerald-400" />
      <Stat label="Dates" value={stats.girlfriends} />
      <Stat label="Fraud Flags" value={stats.fraudFlags} color={stats.fraudFlags > 0 ? "text-red-400" : ""} />
    </div>
  );
}

// ── Players ──────────────────────────────────────────────────────────────────

function PlayersTab({ onError }: { onError: (e: string) => void }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => { loadPlayers(); }, []);

  function loadPlayers(q = "") {
    fetch(`/api/admin/players?q=${q}`).then(r => r.json()).then(d => d.error ? onError(d.error) : setPlayers(d.players || []));
  }

  async function doAction(userId: string, action: string, value?: string) {
    await fetch("/api/admin/players", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userId, value }) });
    loadPlayers(search);
  }

  return (
    <div>
      <input value={search} onChange={e => { setSearch(e.target.value); loadPlayers(e.target.value); }}
        placeholder="Search username..." className="w-full bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-sm text-white mb-4 focus:border-violet-500 focus:outline-none" />
      <div className="space-y-1">
        {players.map((p: any) => (
          <div key={p.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold shrink-0">
              {(p.username || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold truncate">{p.username} {p.countryCode && <span className="text-slate-500">{p.countryCode}</span>}</div>
              <div className="text-slate-600 text-[10px]">ELO {p.eloRating || 1000} · {p.tier || "bronze"} · {p.gamesPlayed || 0} games</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-amber-400">{(p.creditBalance || 0).toLocaleString()} cr</div>
              <div className={`text-[9px] ${p.riskLevel === "block" ? "text-red-400" : p.riskLevel === "restrict" ? "text-orange-400" : p.riskLevel === "monitor" ? "text-yellow-400" : "text-slate-600"}`}>
                Risk: {p.riskScore || 0} ({p.riskLevel || "normal"}) · FP: {p.fairPlayScore ?? 100}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { const amt = prompt("Credits to add:"); if (amt) doAction(p.userId, "add_credits", amt); }}
                className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-[9px]">+CR</button>
              <button onClick={() => doAction(p.userId, "set_risk_level", "block")}
                className="px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 text-[9px]">Ban</button>
              <button onClick={() => doAction(p.userId, "reset_risk")}
                className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-[9px]">Reset</button>
            </div>
          </div>
        ))}
        {players.length === 0 && <div className="text-slate-600 text-center py-8">No players yet</div>}
      </div>
    </div>
  );
}

// ── Transactions ─────────────────────────────────────────────────────────────

function TransactionsTab({ onError }: { onError: (e: string) => void }) {
  const [txs, setTxs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    fetch("/api/admin/transactions").then(r => r.json()).then(d => {
      if (d.error) { onError(d.error); return; }
      setTxs(d.transactions || []);
      setSummary(d.summary);
    });
  }, []);

  return (
    <div>
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Total Rake" value={`${summary.totalRake} cr`} color="text-emerald-400" />
          <Stat label="Total Deposits" value={`${summary.totalDeposits} cr`} />
          <Stat label="Total Withdrawals" value={`${summary.totalWithdrawals} cr`} color="text-red-400" />
          <Stat label="Total Bonuses" value={`${summary.totalBonuses} cr`} color="text-amber-400" />
        </div>
      )}
      <div className="space-y-1">
        {txs.map((tx: any) => (
          <div key={tx.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
            <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
              tx.type === "rake" ? "bg-emerald-600/20 text-emerald-400" :
              tx.type === "deposit" ? "bg-blue-600/20 text-blue-400" :
              tx.type === "withdrawal" ? "bg-red-600/20 text-red-400" :
              tx.type === "game_win" ? "bg-amber-600/20 text-amber-400" :
              "bg-slate-700 text-slate-400"
            }`}>{tx.type}</div>
            <div className="flex-1 text-slate-500 truncate">{tx.userId?.slice(0, 12)}...</div>
            <div className={`font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>{tx.amount >= 0 ? "+" : ""}{tx.amount}</div>
            <div className="text-slate-700 text-[9px]">{new Date(tx.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {txs.length === 0 && <div className="text-slate-600 text-center py-8">No transactions</div>}
      </div>
    </div>
  );
}

// ── Games ────────────────────────────────────────────────────────────────────

function GamesTab({ onError }: { onError: (e: string) => void }) {
  const [games, setGames] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/admin/games").then(r => r.json()).then(d => d.error ? onError(d.error) : setGames(d.games || []));
  }, []);
  return (
    <div className="space-y-1">
      {games.map((g: any) => (
        <div key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
          <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${
            g.status === "completed" ? "bg-emerald-600/20 text-emerald-400" :
            g.status === "in_progress" ? "bg-blue-600/20 text-blue-400" :
            g.status === "voided" ? "bg-red-600/20 text-red-400" :
            "bg-slate-700 text-slate-400"
          }`}>{g.status}</div>
          <div className="font-mono text-slate-400">{g.roomCode}</div>
          <div className="text-slate-500">{g.mode} · {g.maxPlayers}P</div>
          <div className="flex-1" />
          {g.entryFee > 0 && <div className="text-amber-400">{g.entryFee} cr entry</div>}
          {g.rakeAmount > 0 && <div className="text-emerald-400">+{g.rakeAmount} rake</div>}
          <div className="text-slate-700 text-[9px]">{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : ""}</div>
        </div>
      ))}
      {games.length === 0 && <div className="text-slate-600 text-center py-8">No games recorded</div>}
    </div>
  );
}

// ── Fraud ────────────────────────────────────────────────────────────────────

function FraudTab({ onError }: { onError: (e: string) => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/admin/fraud").then(r => r.json()).then(d => d.error ? onError(d.error) : setData(d));
  }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-6">
      {/* Risky Players */}
      <Section title={`High-Risk Players (${data.riskyPlayers?.length || 0})`}>
        {(data.riskyPlayers || []).map((p: any) => (
          <div key={p.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
            <div className="text-white font-bold">{p.username || p.userId?.slice(0, 8)}</div>
            <div className="flex-1" />
            <div className="text-red-400 font-bold">Risk: {p.riskScore}</div>
            <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${
              p.riskLevel === "block" ? "bg-red-600/30 text-red-300" :
              p.riskLevel === "restrict" ? "bg-orange-600/20 text-orange-400" :
              "bg-yellow-600/20 text-yellow-400"
            }`}>{p.riskLevel}</div>
            <div className="text-slate-500">FP: {p.fairPlayScore} · Flags: {p.totalFlags}</div>
          </div>
        ))}
        {(data.riskyPlayers || []).length === 0 && <div className="text-slate-600 text-sm">No high-risk players</div>}
      </Section>

      {/* Collusion Suspects */}
      <Section title={`Collusion Suspects (${data.collusionPairs?.length || 0})`}>
        {(data.collusionPairs || []).map((p: any) => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
            <div className="text-white">{p.playerA?.slice(0, 8)} &harr; {p.playerB?.slice(0, 8)}</div>
            <div className="flex-1" />
            <div className="text-orange-400">Score: {p.collusionScore}</div>
            <div className="text-slate-500">{p.matchesTogether} games · {p.assetTransfers} transfers</div>
          </div>
        ))}
        {(data.collusionPairs || []).length === 0 && <div className="text-slate-600 text-sm">No suspects</div>}
      </Section>

      {/* Recent Fraud Events */}
      <Section title={`Recent Events (${data.events?.length || 0})`}>
        {(data.events || []).slice(0, 20).map((e: any) => (
          <div key={e.id} className="flex items-center gap-3 px-3 py-1.5 text-[10px]">
            <div className={`px-1.5 py-0.5 rounded font-bold ${
              e.severity >= 4 ? "bg-red-600/20 text-red-400" : e.severity >= 3 ? "bg-orange-600/20 text-orange-400" : "bg-yellow-600/20 text-yellow-400"
            }`}>{e.eventType}</div>
            <div className="text-slate-500 truncate flex-1">{e.userId?.slice(0, 12)}</div>
            <div className="text-slate-700">{new Date(e.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ── Dates (existing CRUD) ────────────────────────────────────────────────────

function DatesTab({ onError }: { onError: (e: string) => void }) {
  const [dates, setDates] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", rarity: "common", style: "anime", gender: "female", priceCredits: 200, description: "", personality: "", backstory: "", modelUrl: "", thumbnailUrl: "" });

  useEffect(() => { load(); }, []);
  function load() { fetch("/api/admin/girlfriends").then(r => r.json()).then(d => d.error ? onError(d.error) : setDates(d.girlfriends || [])); }

  async function save() {
    const res = await fetch("/api/admin/girlfriends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form }) });
    if (res.ok) { setShowForm(false); load(); } else { const d = await res.json(); alert(d.error); }
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await fetch("/api/admin/girlfriends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) }); load(); }

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold mb-4">{showForm ? "Cancel" : "+ Add Date"}</button>
      {showForm && (
        <div className="bg-black/20 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Inp label="Name" value={form.name} set={v => setForm({...form, name: v})} />
          <Sel label="Rarity" value={form.rarity} set={v => setForm({...form, rarity: v})} opts={["common","rare","epic","legendary"]} />
          <Sel label="Style" value={form.style} set={v => setForm({...form, style: v})} opts={["anime","realistic","fantasy","cyberpunk","casual"]} />
          <Sel label="Gender" value={form.gender} set={v => setForm({...form, gender: v})} opts={["female","male"]} />
          <Inp label="Price" value={String(form.priceCredits)} set={v => setForm({...form, priceCredits: parseInt(v)||0})} />
          <Inp label="Model URL" value={form.modelUrl} set={v => setForm({...form, modelUrl: v})} />
          <Inp label="Thumbnail" value={form.thumbnailUrl} set={v => setForm({...form, thumbnailUrl: v})} />
          <Inp label="Personality" value={form.personality} set={v => setForm({...form, personality: v})} />
          <Inp label="Description" value={form.description} set={v => setForm({...form, description: v})} />
          <div className="col-span-full"><button onClick={save} disabled={!form.name} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">Create</button></div>
        </div>
      )}
      <div className="space-y-1">
        {dates.map((d: any) => (
          <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
            <span className="text-lg">{d.gender === "female" ? "👩" : "👨"}</span>
            <div className="flex-1 min-w-0">
              <span className="text-white font-bold">{d.name}</span>
              <span className={`ml-2 text-[9px] font-bold uppercase ${d.rarity === "legendary" ? "text-amber-400" : d.rarity === "epic" ? "text-purple-400" : d.rarity === "rare" ? "text-blue-400" : "text-slate-500"}`}>{d.rarity}</span>
              {d.isStarter && <span className="ml-1 text-emerald-400 text-[9px]">FREE</span>}
            </div>
            <div className="text-amber-400">{d.priceCredits} cr</div>
            <div className="text-slate-600">{d.totalEquipped} equip</div>
            <button onClick={() => del(d.id)} className="text-slate-700 hover:text-red-400 text-[9px]">Del</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bots ──────────────────────────────────────────────────────────────────────

function BotsTab({ onError }: { onError: (e: string) => void }) {
  const [bots, setBots] = useState<any[]>([]);
  useEffect(() => { load(); }, []);
  function load() { fetch("/api/admin/bots").then(r => r.json()).then(d => d.error ? onError(d.error) : setBots(d.bots || [])); }
  function flag(code: string) { try { return String.fromCodePoint(...code.toUpperCase().split("").map((c: string) => 0x1F1E6 + c.charCodeAt(0) - 65)); } catch { return ""; } }

  async function toggle(botId: string, active: boolean) {
    await fetch("/api/admin/bots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_active", botId, value: !active }) });
    load();
  }

  return (
    <div>
      <div className="text-slate-500 text-xs mb-3">{bots.length} bots in pool</div>
      <div className="space-y-1">
        {bots.map((b: any) => (
          <div key={b.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${b.isActive ? "bg-white/[0.02] border-white/5" : "bg-red-950/20 border-red-500/10 opacity-60"}`}>
            <span>{flag(b.countryCode)}</span>
            <div className="text-white font-bold flex-1">{b.displayName}</div>
            <div className="text-slate-500 capitalize">{b.personality}</div>
            <div className={`text-[9px] font-bold capitalize ${b.tier === "diamond" ? "text-violet-400" : b.tier === "platinum" ? "text-cyan-400" : b.tier === "gold" ? "text-amber-400" : "text-slate-500"}`}>{b.tier}</div>
            <div className="text-slate-400">ELO {b.eloRating}</div>
            <div className="text-slate-600">{b.gamesPlayed}G / {b.gamesWon}W</div>
            <button onClick={() => toggle(b.botId, b.isActive)}
              className={`px-2 py-1 rounded text-[9px] font-bold ${b.isActive ? "bg-red-600/20 text-red-400" : "bg-emerald-600/20 text-emerald-400"}`}>
              {b.isActive ? "Disable" : "Enable"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────────────────

function Stat({ label, value, color = "text-white" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3">
      <div className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">{label}</div>
      <div className={`text-xl font-black ${color}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Loading() { return <div className="text-slate-600 text-center py-12">Loading...</div>; }

function Inp({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <div>
      <label className="text-[9px] text-slate-600 font-bold uppercase block mb-0.5">{label}</label>
      <input value={value} onChange={e => set(e.target.value)} className="w-full bg-black/30 border border-white/8 rounded px-2 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none" />
    </div>
  );
}

function Sel({ label, value, set, opts }: { label: string; value: string; set: (v: string) => void; opts: string[] }) {
  return (
    <div>
      <label className="text-[9px] text-slate-600 font-bold uppercase block mb-0.5">{label}</label>
      <select value={value} onChange={e => set(e.target.value)} className="w-full bg-black/30 border border-white/8 rounded px-2 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none">
        {opts.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
      </select>
    </div>
  );
}
