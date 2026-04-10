"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CasinoBackground from "@/components/CasinoBackground";
import { CITY_CONFIGS } from "@/components/CasinoBackground";
import AvatarPicker from "@/components/AvatarPicker";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";
import dynamic from "next/dynamic";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";

const IntroOverlay = dynamic(() => import("@/components/IntroOverlay"), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const { user, profile, isAdmin, equippedDate, loading: authLoading } = useAuth();

  // Admins are redirected to admin dashboard — they can't play
  useEffect(() => {
    if (!authLoading && isAdmin) router.push("/admin");
  }, [isAdmin, authLoading, router]);
  const [tab, setTab] = useState("create");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [activeGame, setActiveGame] = useState(null);
  const [city, setCity] = useState("lasvegas");
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [showCities, setShowCities] = useState(false);

  useEffect(() => {
    const entries = Object.entries(localStorage)
      .filter(([k]) => k.startsWith("pr_") && k.endsWith("_pid"));
    if (entries.length === 0) return;
    (async () => {
      for (const [key, playerId] of entries) {
        const rid = key.slice(3, -4);
        try {
          const res = await fetch(`/api/game?roomId=${rid}&playerId=${playerId}`, { cache: "no-store" });
          if (!res.ok) { localStorage.removeItem(key); continue; }
          const data = await res.json();
          if (data.phase === "ended") { localStorage.removeItem(key); continue; }
          setActiveGame({ roomId: rid, playerId, phase: data.phase });
          return;
        } catch { /* ignore */ }
      }
      const savedCity = localStorage.getItem("pr_city");
      if (savedCity && CITY_CONFIGS[savedCity]) setCity(savedCity);
      const savedAvatar = localStorage.getItem("pr_avatar");
      if (savedAvatar) setAvatarId(parseInt(savedAvatar));
    })();
  }, []);

  const handleIntroDone = useCallback(() => {
    if (!pendingRoom) return;
    router.push(`/room/${pendingRoom.roomId}`);
  }, [pendingRoom, router]);

  async function handleCreate() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    setErr(""); setLoading(true);
    localStorage.setItem("pr_avatar", avatarId.toString());
    try {
      const res = await fetch("/api/game", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createRoom", playerName: name.trim(), maxPlayers, avatarId, dateInfo: equippedDate ? { name: equippedDate.name, rarity: equippedDate.rarity, thumbnailUrl: equippedDate.thumbnailUrl } : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      localStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      setLoading(false);
      setPendingRoom({ roomId: data.roomId, playerId: data.playerId });
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  async function handleSolo() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    setErr(""); setLoading(true);
    localStorage.setItem("pr_avatar", avatarId.toString());
    try {
      const res = await fetch("/api/game", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createSoloRoom", playerName: name.trim(), avatarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      localStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
      setLoading(false);
      setPendingRoom({ roomId: data.roomId, playerId: data.playerId });
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  async function handleJoin() {
    if (!name.trim()) { setErr("Enter your name first"); return; }
    if (!roomId.trim()) { setErr("Enter a room code"); return; }
    setErr(""); setLoading(true);
    localStorage.setItem("pr_avatar", avatarId.toString());
    const code = roomId.trim().toUpperCase();
    try {
      const res = await fetch("/api/game", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "joinRoom", roomId: code, playerName: name.trim(), avatarId, dateInfo: equippedDate ? { name: equippedDate.name, rarity: equippedDate.rarity, thumbnailUrl: equippedDate.thumbnailUrl } : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`pr_${code}_pid`, data.playerId);
      localStorage.setItem(`pr_${code}_pid`, data.playerId);
      setLoading(false);
      setPendingRoom({ roomId: code, playerId: data.playerId });
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  // Auto-fill name from auth profile
  useEffect(() => {
    if (profile?.username && !name) setName(profile.username);
    else if (user?.name && !name) setName(user.name);
  }, [profile, user]); // eslint-disable-line

  const currentCity = CITY_CONFIGS[city] || CITY_CONFIGS.lasvegas;
  const isLoggedIn = !!user;

  return (
    <div className="min-h-full flex flex-col relative">
      {pendingRoom && <IntroOverlay onDone={handleIntroDone} dateImageUrl={equippedDate?.thumbnailUrl} />}
      <CasinoBackground city={city} dateImageUrl={equippedDate?.thumbnailUrl} />

      <Nav />

      <div className="relative z-10 flex-1 flex flex-col">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center pt-6 sm:pt-10 pb-4 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">
              {currentCity.label} Table
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Property<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Rush</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-3 max-w-sm">
            Beat opponents. Collect 3 sets. Take the pot.
          </p>

          {/* QUICK MATCH — creates a room, waits for players, fills with bots after 60s */}
          <button
            onClick={() => {
              const quickName = name.trim() || (isLoggedIn ? (profile?.username || user?.name) : `Player${Math.floor(Math.random() * 999)}`);
              setName(quickName);
              localStorage.setItem("pr_avatar", avatarId.toString());
              setLoading(true);
              fetch("/api/game", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "createRoom", playerName: quickName, maxPlayers: 4, avatarId, dateInfo: equippedDate ? { name: equippedDate.name, rarity: equippedDate.rarity, thumbnailUrl: equippedDate.thumbnailUrl } : null }),
              })
                .then(r => r.json())
                .then(data => {
                  if (data.error) { setErr(data.error); setLoading(false); return; }
                  sessionStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
                  localStorage.setItem(`pr_${data.roomId}_pid`, data.playerId);
                  setLoading(false);
                  setPendingRoom({ roomId: data.roomId, playerId: data.playerId });
                })
                .catch(e => { setErr(e.message); setLoading(false); });
            }}
            disabled={loading}
            className="mt-5 px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-black text-lg transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Finding match..." : "Play Now"}
          </button>
          <p className="text-slate-600 text-[10px] mt-1.5">Instant match &middot; no signup needed</p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {[
              { icon: "👥", text: "2-4 Players" },
              { icon: "⏱", text: "~3 min games" },
              { icon: "🔒", text: "Provably Fair" },
              { icon: "💎", text: "Win Credits" },
            ].map((f) => (
              <span key={f.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-white/70 text-xs font-medium">
                <span>{f.icon}</span>{f.text}
              </span>
            ))}
          </div>
        </div>

        {/* ── Live Activity Bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 px-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">LIVE</span>
          </span>
          <span>Games today: <span className="text-white font-bold">--</span></span>
          <span className="hidden sm:inline">Players online: <span className="text-white font-bold">--</span></span>
          <span className="hidden sm:inline">Total won: <span className="text-amber-400 font-bold">--</span> credits</span>
        </div>

        {/* ── Main Content: two columns on desktop ──────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 px-4 sm:px-8 pb-8 max-w-5xl mx-auto w-full">

          {/* Left: Quick Play Actions */}
          <div className="w-full lg:w-96 space-y-4">
            {/* Rejoin banner */}
            {activeGame && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-5 py-4 flex items-center gap-3 animate-pulse">
                <div className="flex-1">
                  <div className="text-emerald-300 font-bold text-sm">Game in progress</div>
                  <div className="text-emerald-400/60 text-xs font-mono mt-0.5">Room: {activeGame.roomId}</div>
                </div>
                <button
                  onClick={() => {
                    sessionStorage.setItem(`pr_${activeGame.roomId}_pid`, activeGame.playerId);
                    router.push(`/room/${activeGame.roomId}`);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition"
                >
                  Rejoin
                </button>
              </div>
            )}

            {/* Game Form Card */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/8 rounded-2xl p-5 shadow-2xl">
              {/* Tab Switch */}
              <div className="flex rounded-xl bg-black/30 p-1 mb-5">
                <TabBtn active={tab === "create"} onClick={() => { setTab("create"); setErr(""); }}>Create Room</TabBtn>
                <TabBtn active={tab === "join"} onClick={() => { setTab("join"); setErr(""); }}>Join Room</TabBtn>
              </div>

              {/* Name Input — auto-filled when logged in, editable */}
              <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-1.5">
                {isLoggedIn ? "Playing as" : "Player Name"}
              </label>
              <div className="relative mb-4">
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
                  placeholder={isLoggedIn ? profile?.username || user?.name : "Enter your name"} maxLength={20}
                  className={`w-full bg-black/30 border rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all ${
                    isLoggedIn ? "border-violet-500/20" : "border-white/8"
                  }`}
                />
                {isLoggedIn && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-violet-400/60">
                    edit to change
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="mb-4">
                <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-1.5">Avatar</label>
                <AvatarPicker
                  selected={avatarId}
                  onSelect={(id) => { setAvatarId(id); localStorage.setItem("pr_avatar", id.toString()); }}
                />
              </div>

              {tab === "create" && (
                <>
                  <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-1.5">Players</label>
                  <div className="flex gap-2 mb-4">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n} onClick={() => setMaxPlayers(n)}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                          maxPlayers === n
                            ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20"
                            : "bg-black/20 border-white/8 text-slate-500 hover:text-white hover:border-white/15"
                        }`}
                      >
                        {n}P
                      </button>
                    ))}
                  </div>

                  {/* City Selector (collapsed) */}
                  <button
                    onClick={() => setShowCities(!showCities)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-black/20 border border-white/5 text-slate-400 text-xs mb-4 hover:border-white/10 transition"
                  >
                    <span>Table: {currentCity.label}</span>
                    <span className="text-[10px]">{showCities ? "▲" : "▼"}</span>
                  </button>
                  {showCities && (
                    <div className="grid grid-cols-3 gap-1 mb-4">
                      {Object.entries(CITY_CONFIGS).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => { setCity(key); localStorage.setItem("pr_city", key); setShowCities(false); }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition border ${
                            city === key
                              ? "bg-violet-600/60 border-violet-400/50 text-white"
                              : "bg-black/20 border-white/5 text-slate-500 hover:text-white"
                          }`}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === "join" && (
                <>
                  <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-1.5">Room Code</label>
                  <input
                    type="text" value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="ABC123" maxLength={6}
                    className="w-full bg-black/30 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all mb-4"
                  />
                </>
              )}

              {err && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{err}</div>
              )}

              <button
                onClick={tab === "create" ? handleCreate : handleJoin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold text-sm transition-all shadow-lg shadow-violet-500/15"
              >
                {loading ? "Loading..." : tab === "create" ? "Create Room" : "Join Game"}
              </button>

              <p className="text-center text-slate-700 text-[9px] mt-3">
                Games start when players join. Share room code to play with friends.
              </p>
            </div>
          </div>

          {/* Right: Info Cards (desktop) */}
          <div className="hidden lg:flex flex-col gap-4 w-80">
            {/* How to Play */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-bold text-sm mb-3">How to Play</h3>
              <div className="space-y-3">
                {[
                  { step: "1", title: "Draw cards", desc: "Draw 2 cards at the start of your turn" },
                  { step: "2", title: "Play cards", desc: "Play up to 3 cards — properties, money, or actions" },
                  { step: "3", title: "Collect sets", desc: "First to complete 3 full property sets wins!" },
                ].map((s) => (
                  <div key={s.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0">{s.step}</div>
                    <div>
                      <div className="text-white text-xs font-semibold">{s.title}</div>
                      <div className="text-slate-500 text-[11px] leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <a href="/cards" className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 hover:border-violet-500/20 transition group">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-lg">🃏</div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold group-hover:text-violet-300 transition">Card Gallery</div>
                <div className="text-slate-500 text-[11px]">View all 110 cards & effects</div>
              </div>
              <span className="text-slate-600 group-hover:text-white transition">→</span>
            </a>

            <a href="/credits" className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 hover:border-emerald-500/20 transition group">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-lg">💰</div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold group-hover:text-emerald-300 transition">Credits & Wallet</div>
                <div className="text-slate-500 text-[11px]">Deposit, withdraw, manage funds</div>
              </div>
              <span className="text-slate-600 group-hover:text-white transition">→</span>
            </a>

            <a href="/leaderboard" className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 hover:border-amber-500/20 transition group">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center text-lg">🏆</div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold group-hover:text-amber-300 transition">Leaderboard</div>
                <div className="text-slate-500 text-[11px]">Top players & rankings</div>
              </div>
              <span className="text-slate-600 group-hover:text-white transition">→</span>
            </a>

          </div>
        </div>

        {/* ── Floating "Your Date" CTA — pinned near the 3D girl ───── */}
        <a
          href="/partners"
          className="hidden lg:flex fixed bottom-32 right-48 z-20 items-center gap-2 group animate-bounce-arrow"
        >
          <div className="bg-black/60 backdrop-blur-md border border-pink-500/30 rounded-2xl pl-5 pr-4 py-3 shadow-2xl shadow-pink-500/10 group-hover:border-pink-400/50 group-hover:shadow-pink-500/20 transition-all max-w-[240px]">
            <div className="flex items-center gap-2">
              <span className="text-xl">❤️</span>
              <div
                className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-fuchsia-400"
                style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
              >
                Bring a Date
              </div>
              <span className="text-2xl" style={{ transform: "rotate(30deg) scaleX(-1)", display: "inline-block" }}>🏹</span>
            </div>
            <div className="text-[10px] text-pink-300/80 leading-relaxed mt-1.5 pl-8">
              Your date cheers you on, roasts opponents & celebrates your wins at the table
            </div>
            <div className="text-[9px] text-pink-400/50 font-bold tracking-wider uppercase mt-1 pl-8">
              4 free starters &middot; tap to choose
            </div>
          </div>
        </a>

        {/* ── Footer Disclaimers ───────────────────────────────────────── */}
        <footer className="hidden lg:block relative z-10 border-t border-white/5 mt-8 px-8 py-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Provably Fair</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Every game uses SHA-256 cryptographic seed commitment. The deck order is mathematically determined before the game starts and cannot be changed. Verify any game at <a href="/fairness" className="text-violet-500 hover:underline">/fairness</a>.
                </p>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Responsible Gaming</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Play responsibly. We enforce loss limits, cooldown periods, and daily caps to protect players. If you feel you are losing control, please take a break. Free rooms are always available.
                </p>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Security</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  All transactions are on Polygon blockchain. Funds are secured in encrypted wallets. We use rate limiting, fraud detection, and anti-cheat systems to keep gameplay fair for everyone.
                </p>
              </div>
            </div>
            <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[10px] text-slate-700">
                PropertyRush is a skill-based card game. Not a gambling platform. Credits have no real-world cash value until withdrawn. 18+ only.
              </p>
              <div className="flex items-center gap-4 text-[10px] text-slate-700">
                <a href="/fairness" className="hover:text-slate-400 transition">Provably Fair</a>
                <span>&middot;</span>
                <a href="/responsible-gaming" className="hover:text-slate-400 transition">Responsible Gaming</a>
                <span>&middot;</span>
                <a href="/security" className="hover:text-slate-400 transition">Security</a>
                <span>&middot;</span>
                <span>Terms</span>
                <span>&middot;</span>
                <span>Privacy</span>
              </div>
            </div>

            {/* ── Gaming License ──────────────────────────────────────── */}
            <div className="border-t border-white/5 mt-4 pt-4">
              <div className="flex items-start gap-5">
                {/* QR Code */}
                <a href="https://verify.bougainvilleoga.org/certificate.php?license=OW5MYCGWN0XN" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group" title="Scan to verify license">
                  <div className="w-16 h-16 p-1 rounded-lg border border-white/10 bg-white/5 group-hover:bg-white/10 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" shapeRendering="crispEdges" className="w-full h-full text-slate-400 group-hover:text-slate-300 transition"><path fill="transparent" d="M0 0h45v45H0z"/><path stroke="currentColor" d="M4 4.5h7m2 0h1m1 0h2m2 0h2m1 0h1m1 0h1m1 0h3m1 0h1m3 0h7M4 5.5h1m5 0h1m2 0h2m2 0h1m3 0h1m1 0h1m1 0h5m1 0h2m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h1m3 0h1m6 0h3m2 0h1m2 0h2m1 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h2m3 0h1m2 0h4m2 0h1m1 0h4m2 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h1m3 0h1m1 0h1m1 0h1m1 0h3m2 0h1m1 0h1m2 0h1m1 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m1 0h1m4 0h4m1 0h1m7 0h2m2 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h2m4 0h1m4 0h1m2 0h1m1 0h1m1 0h1m1 0h1M4 12.5h1m1 0h5m7 0h1m3 0h1m1 0h6m4 0h5M4 13.5h1m1 0h2m1 0h1m2 0h1m5 0h4m7 0h1m2 0h1m2 0h1m3 0h1M5 14.5h2m3 0h2m4 0h3m2 0h1m2 0h3m1 0h10m1 0h2M4 15.5h1m1 0h3m3 0h1m1 0h2m1 0h1m2 0h1m4 0h1m2 0h1m1 0h1m4 0h2m3 0h1M5 16.5h1m1 0h4m1 0h4m1 0h2m2 0h1m2 0h1m1 0h6m1 0h8M5 17.5h5m1 0h1m3 0h1m4 0h5m2 0h1m2 0h1m4 0h1m3 0h1M5 18.5h3m1 0h2m2 0h1m4 0h2m1 0h1m2 0h2m2 0h1m2 0h3m1 0h3m1 0h2M4 19.5h1m1 0h1m1 0h2m4 0h1m1 0h2m2 0h6m1 0h1m3 0h1m2 0h3m2 0h2M4 20.5h2m1 0h2m1 0h1m1 0h3m1 0h1m1 0h3m2 0h1m1 0h1m3 0h2m1 0h5m1 0h1m1 0h1M5 21.5h1m3 0h1m1 0h2m5 0h2m2 0h1m1 0h2m1 0h1m4 0h1m6 0h1M4 22.5h7m1 0h1m1 0h1m1 0h1m2 0h5m1 0h2m3 0h2m1 0h2m4 0h2M7 23.5h1m1 0h1m2 0h1m1 0h1m2 0h3m3 0h4m1 0h1m1 0h1m1 0h3m2 0h1m2 0h1M4 24.5h2m4 0h1m3 0h1m1 0h2m1 0h1m1 0h1m1 0h1m2 0h2m1 0h2m1 0h3m1 0h3M5 25.5h2m2 0h1m2 0h2m1 0h4m1 0h1m1 0h3m2 0h1m4 0h2m3 0h1M5 26.5h1m4 0h3m2 0h2m1 0h3m1 0h1m3 0h1m1 0h1m1 0h2m3 0h3m1 0h2M6 27.5h1m1 0h1m2 0h4m1 0h1m1 0h2m3 0h2m2 0h1m4 0h5m2 0h1M4 28.5h2m1 0h1m2 0h1m2 0h1m3 0h2m3 0h6m2 0h2m1 0h4m1 0h1m1 0h1M4 29.5h2m1 0h1m1 0h1m2 0h3m4 0h2m7 0h1m1 0h1m1 0h1m2 0h1m2 0h1M4 30.5h1m3 0h1m1 0h1m2 0h2m2 0h1m6 0h1m1 0h1m1 0h5m1 0h1m2 0h4M4 31.5h1m3 0h2m1 0h1m3 0h4m1 0h1m4 0h2m1 0h1m1 0h3m3 0h1m2 0h1M4 32.5h1m1 0h3m1 0h1m3 0h2m2 0h1m2 0h1m4 0h11m1 0h1M12 33.5h2m2 0h1m3 0h2m1 0h1m1 0h1m1 0h1m1 0h1m1 0h2m3 0h2M4 34.5h7m2 0h1m2 0h1m1 0h2m1 0h1m2 0h2m6 0h1m1 0h1m1 0h1m1 0h3M4 35.5h1m5 0h1m1 0h1m2 0h8m2 0h2m1 0h1m3 0h1m3 0h2m1 0h2M4 36.5h1m1 0h3m1 0h1m1 0h2m5 0h2m4 0h1m1 0h1m3 0h6m1 0h1M4 37.5h1m1 0h3m1 0h1m1 0h1m3 0h1m1 0h2m2 0h1m1 0h4m2 0h1m2 0h2m1 0h2m1 0h1M4 38.5h1m1 0h3m1 0h1m1 0h1m1 0h1m4 0h5m2 0h3m2 0h2m4 0h1m2 0h1M4 39.5h1m5 0h1m2 0h1m3 0h1m1 0h1m2 0h6m2 0h3m1 0h1m1 0h1m3 0h1M4 40.5h7m1 0h1m2 0h2m2 0h3m1 0h1m2 0h5m2 0h1m2 0h5"/></svg>
                  </div>
                </a>
                {/* License Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Licensed</span>
                    </span>
                    <span className="text-[9px] text-slate-600">Valid till 10/04/2028</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Licensed by <span className="text-slate-400 font-medium">Bougainville Offshore Gaming Authority</span>.
                    License No: <span className="text-slate-400 font-mono">OW5MYCGWN0XN</span>
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Operator: <span className="text-slate-500">Shayan Games Limited</span>
                    <span className="mx-1.5 text-slate-700">&middot;</span>
                    URL: <span className="text-slate-500">propertyrush.net</span>
                    <span className="mx-1.5 text-slate-700">&middot;</span>
                    CIN: <span className="text-slate-500 font-mono">V8SYQ5JE0001</span>
                  </p>
                  <a href="https://verify.bougainvilleoga.org/certificate.php?license=OW5MYCGWN0XN" target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[9px] text-violet-500 hover:text-violet-400 hover:underline transition">
                    Verify License &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* ── Mobile Bottom Nav ────────────────────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-white/5 px-2 py-1.5 flex justify-around safe-bottom">
          <MobileNavBtn href="/" icon="🏠" label="Home" active />
          <MobileNavBtn href="/cards" icon="🃏" label="Cards" />
          <MobileNavBtn href="/credits" icon="💰" label="Credits" />
          <MobileNavBtn href="/leaderboard" icon="🏆" label="Ranks" />
          <MobileNavBtn href="/login" icon="👤" label="Sign In" />
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
        active ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function MobileNavBtn({ href, icon, label, active }) {
  return (
    <a href={href} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${active ? "text-violet-400" : "text-slate-500"}`}>
      <span className="text-base">{icon}</span>
      <span className="text-[9px] font-medium">{label}</span>
    </a>
  );
}
