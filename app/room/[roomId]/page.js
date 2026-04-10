"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import GameBoard from "@/components/GameBoard";
import CasinoBackground from "@/components/CasinoBackground";
import MusicPlayer from "@/components/MusicPlayer";
import { getMusicPlayer } from "@/lib/pixabayMusic";
import { setNarratorEnabled } from "@/lib/narrator";
import { useAuth } from "@/lib/useAuth";

const POLL_FAST           = 800;   // During active gameplay
const POLL_NORMAL         = 1500;  // Default
const POLL_SLOW           = 2500;  // Waiting room / game ended
const MAX_PLAYERS         = 4;
const COLD_FAIL_MAX       = 15;    // redirect only if never connected after ~30 s
const RECONNECT_THRESHOLD = 3;     // show "reconnecting" only after 3 consecutive fails
const MOVE_RETRIES        = 3;     // retry failed moves before showing error
const RETRY_BASE_MS       = 600;   // backoff base (600 ms, 1200 ms, 1800 ms)

export default function RoomPage() {
  const { roomId } = useParams();
  const router     = useRouter();
  const { isAdmin, equippedDate, loading: authLoading } = useAuth();

  // Admins can't play — redirect to admin dashboard
  useEffect(() => {
    if (!authLoading && isAdmin) router.push("/admin");
  }, [isAdmin, authLoading, router]);

  const [myId,            setMyId]            = useState(null);
  const [state,           setState]           = useState(null);
  const stateRef = useRef(null);
  const [moveError,       setMoveError]       = useState("");
  const [copied,          setCopied]          = useState(false);
  const [soundOn,         setSoundOn]         = useState(false);
  const [reconnecting,    setReconnecting]    = useState(false);
  const [prevPhase,       setPrevPhase]       = useState(null);
  const [prevTurnIdx,     setPrevTurnIdx]     = useState(null);
  const [city,            setCity]            = useState("lasvegas");
  const [cardPlayCount,   setCardPlayCount]   = useState(0);  // bumped on every card play
  const [lossTarget,      setLossTarget]      = useState(-1); // player index hit by negative action

  const myIdRef          = useRef(null);
  const soundsRef        = useRef(null);
  const failsRef         = useRef(0);
  const everConnectedRef = useRef(false); // once we get a good state, never auto-redirect

  // ── Identity ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const pid = sessionStorage.getItem(`pr_${roomId}_pid`)
             ?? localStorage.getItem(`pr_${roomId}_pid`);
    if (!pid) { router.push("/"); return; }
    // Restore into sessionStorage in case only localStorage had it (after refresh)
    sessionStorage.setItem(`pr_${roomId}_pid`, pid);
    setMyId(pid);
    myIdRef.current = pid;
    const savedCity = localStorage.getItem("pr_city");
    if (savedCity) setCity(savedCity);
  }, [roomId, router]);

  // ── Sound ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!soundOn) {
      // Stop Pixabay music when turning off
      if (typeof window !== "undefined") getMusicPlayer().stop();
      setNarratorEnabled(false);
      return;
    }
    setNarratorEnabled(true);
    // Enable SFX via Web Audio (separate from background music)
    import("@/lib/sounds").then((m) => {
      soundsRef.current = m;
      // Enable only SFX, not the procedural background music
      m.setSfxEnabled(true);
    });
    // Start Pixabay streaming music
    const p = getMusicPlayer();
    p.play();
    p.loadCity(city ?? "lasvegas");
    return () => p.stop();
  }, [soundOn]); // eslint-disable-line

  // ── Reload music on city change ────────────────────────────────────────────
  useEffect(() => {
    if (!soundOn) return;
    const p = getMusicPlayer();
    p.loadCity(city);
  }, [city]); // eslint-disable-line

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    let interval;

    const lastJsonRef = { current: "" };
    const poll = async () => {
      try {
        const res = await fetch(`/api/game?roomId=${roomId}&playerId=${myId}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const text = await res.text();
          everConnectedRef.current = true;
          failsRef.current = 0;
          setReconnecting(false);
          // Skip re-render if state hasn't changed
          if (text !== lastJsonRef.current) {
            lastJsonRef.current = text;
            const parsed = JSON.parse(text);
            stateRef.current = parsed;
            setState(parsed);
          }
        } else {
          failsRef.current += 1;
          // Only show reconnecting UI after several consecutive failures (avoids flicker)
          if (failsRef.current >= RECONNECT_THRESHOLD) setReconnecting(true);
          if (!everConnectedRef.current && failsRef.current >= COLD_FAIL_MAX) {
            router.push("/");
          }
        }
      } catch {
        failsRef.current += 1;
        if (failsRef.current >= RECONNECT_THRESHOLD) setReconnecting(true);
        if (!everConnectedRef.current && failsRef.current >= COLD_FAIL_MAX) {
          router.push("/");
        }
      }
    };

    poll();
    // Adaptive polling — faster during active play
    const tick = () => {
      const phase = stateRef.current?.phase;
      const speed = phase === "playing" ? POLL_FAST : phase === "waiting" ? POLL_SLOW : POLL_NORMAL;
      interval = setTimeout(() => { poll().then(tick); }, speed);
    };
    tick();
    return () => clearTimeout(interval);
  }, [myId, roomId, router]);

  // ── SFX ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state || !soundsRef.current) return;
    const s = soundsRef.current;
    if (state.phase === "ended" && prevPhase !== "ended") s.sfxWin?.();
    else if (state.turnIndex !== prevTurnIdx) s.sfxCardDraw?.();
    setPrevPhase(state.phase);
    setPrevTurnIdx(state.turnIndex);
  }, [state, prevPhase, prevTurnIdx]);

  // ── Detect negative actions from game log for character loss-reaction ──────
  const prevLogRef = useRef(null);
  useEffect(() => {
    if (!state?.log?.length) return;
    const topEntry = state.log[0];
    if (topEntry === prevLogRef.current) return;
    prevLogRef.current = topEntry;
    // Keywords that mean someone got hit
    // Trigger card-play reaction on ANY new log entry (including bot moves)
    setCardPlayCount(c => c + 1);

    // Negative actions trigger loss reaction
    const negKeywords = /pays|steals|take|rent|collect|tax|swap|wreck|dismantle/i;
    if (negKeywords.test(topEntry)) {
      const numPlayers = state.players?.length ?? 2;
      setLossTarget(Math.floor(Math.random() * numPlayers));
    }
  }, [state]);

  // ── Move (with retry) ─────────────────────────────────────────────────────
  const handleMove = useCallback(async (move) => {
    setMoveError("");
    soundsRef.current?.sfxCardPlay?.();

    // Bump card-play reaction for any card played by the human player
    if (move.type === "play") {
      setCardPlayCount((c) => c + 1);
    }

    const body = JSON.stringify({ action: "playMove", roomId, playerId: myIdRef.current, move });

    for (let attempt = 1; attempt <= MOVE_RETRIES; attempt++) {
      try {
        const res  = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = await res.json();

        if (res.ok) {
          // Fire-and-forget state refresh — don't block the UI
          fetch(`/api/game?roomId=${roomId}&playerId=${myIdRef.current}`, { cache: "no-store" })
            .then(r => r.ok ? r.text() : null)
            .then(text => { if (text) setState(JSON.parse(text)); })
            .catch(() => {});
          return;
        }

        const isTransient = res.status >= 500 || data.error === "Room not found";
        if (isTransient && attempt < MOVE_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_BASE_MS * attempt));
          continue;
        }
        throw new Error(data.error);
      } catch (e) {
        if (attempt < MOVE_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_BASE_MS * attempt));
          continue;
        }
        setMoveError(e.message ?? "Connection error — try again");
        setTimeout(() => setMoveError(""), 5000);
      }
    }
  }, [roomId]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(roomId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WAITING ROOM
  // ─────────────────────────────────────────────────────────────────────────

  // Auto-fill with bots after 60 seconds (ref-based — no re-renders)
  const autoFillRef = useRef(false);
  const waitTimerRef = useRef(null);
  const waitSecondsRef = useRef(0);
  const waitDisplayRef = useRef(null);

  useEffect(() => {
    if (!state || state.phase !== "waiting" || !myId) return;
    const isHost = state.hostId === myId;
    if (!isHost) return;

    waitSecondsRef.current = 0;
    waitTimerRef.current = setInterval(() => {
      waitSecondsRef.current += 1;
      // Update DOM directly — no setState re-render
      if (waitDisplayRef.current) {
        const secs = 60 - waitSecondsRef.current;
        waitDisplayRef.current.textContent = secs > 0 ? `Auto-fill in ${secs}s` : "Filling...";
      }
      // Trigger auto-fill at 60 seconds
      if (waitSecondsRef.current >= 60 && !autoFillRef.current) {
        autoFillRef.current = true;
        fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fillBotsAndStart", roomId, playerId: myId }),
        }).catch(() => {});
      }
    }, 1000);

    return () => { if (waitTimerRef.current) clearInterval(waitTimerRef.current); };
  }, [state?.phase, state?.hostId, myId, roomId]);

  if (!state || state.phase === "waiting") {
    const cap     = state?.roomMaxPlayers ?? MAX_PLAYERS;
    const joined  = state?.players?.length ?? 1;
    const needed  = cap - joined;
    const players = state?.players ?? [];
    const isHost   = state?.hostId === myId;
    const canStart = isHost && joined >= 2 && joined < cap;

    const handleStart = async () => {
      try {
        const res = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "startGame", roomId, playerId: myId }),
        });
        const data = await res.json();
        if (!res.ok) alert(data.error);
      } catch {}
    };

    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4 relative">
        <CasinoBackground city={city} cheering={state?.phase === "ended"} players={state?.players ?? []} gameActive={false} dateImageUrl={equippedDate?.thumbnailUrl} />
        <div className="relative z-10 w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-sm bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3 animate-bounce-sm">⏳</div>
            <h2 className="text-white font-black text-2xl">Waiting for players</h2>
            <p className="text-slate-400 text-sm mt-1">
              {reconnecting ? "Reconnecting…" : needed > 0
                ? `Need ${needed} more player${needed > 1 ? "s" : ""} (${joined}/${cap})`
                : "Starting…"}
            </p>
          </div>

          <div className="flex gap-1.5 mb-6">
            {Array.from({ length: cap }).map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < joined ? "bg-emerald-400" : "bg-slate-700"}`} />
            ))}
          </div>

          <div className="space-y-2 mb-6">
            {Array.from({ length: cap }).map((_, i) => {
              const p = players[i];
              return (
                <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${p ? "bg-white/5 border border-white/10" : "border border-dashed border-white/10"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${p ? "bg-indigo-600/70 text-white" : "bg-slate-800 text-slate-600"}`}>
                    {p ? p.name[0].toUpperCase() : i + 1}
                  </div>
                  <span className={p ? "text-white font-medium text-sm" : "text-slate-600 text-sm"}>
                    {p ? p.name : `Player ${i + 1}`}
                  </span>
                  {p && p.id === state?.hostId && <span className="ml-auto text-yellow-400 text-xs">host</span>}
                  {p && p.id !== state?.hostId && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                </div>
              );
            })}
          </div>

          <div onClick={handleCopy} className="flex items-center justify-center gap-3 bg-slate-900/80 border border-indigo-500/30 rounded-2xl py-4 px-6 cursor-pointer hover:border-indigo-400/50 transition-colors mb-2">
            <span className="text-indigo-300 font-mono font-black text-2xl tracking-widest">{roomId}</span>
            <span className="text-slate-500">{copied ? "✓" : "📋"}</span>
          </div>
          <p className="text-slate-500 text-xs text-center mb-4">{copied ? "Copied!" : "Share this code with friends"}</p>

          {canStart && (
            <button
              onClick={handleStart}
              className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors mb-3"
            >
              Start Early ({joined}/{cap} players) ▶
            </button>
          )}

          <div className="flex items-center gap-2 justify-center">
            <div className={`w-2 h-2 rounded-full ${reconnecting ? "bg-yellow-400" : "bg-emerald-400"} animate-pulse`} />
            <span className="text-slate-400 text-xs">
              {reconnecting ? "Reconnecting…" : `Waiting for ${cap} players to join`}
            </span>
            {state?.hostId === myId && <span ref={waitDisplayRef} className="text-slate-500 text-[10px] ml-1"></span>}
          </div>

          <div className="flex items-center gap-2 justify-center mt-3">
            <button
              onClick={() => setSoundOn((v) => !v)}
              className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-sm transition-colors"
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
            {soundOn && <MusicPlayer city={city} enabled={soundOn} onToggle={() => setSoundOn(false)} />}
          </div>
        </div>

        <button
          onClick={() => { if (window.confirm("Leave the room?")) router.push("/"); }}
          className="mt-4 text-slate-600 hover:text-slate-400 text-sm transition-colors"
        >
          ← Leave Room
        </button>
        </div>
      </div>
    );
  }

  // ── City cycle helper ─────────────────────────────────────────────────────
  const CITY_KEYS = ["lasvegas","tokyo","macau","montecarlo","singapore","atlantic","badenbaden","sanjose","paradise","london","sydney"];
  const cycleCity = () => {
    setCity((prev) => {
      const idx = CITY_KEYS.indexOf(prev);
      const next = CITY_KEYS[(idx + 1) % CITY_KEYS.length];
      localStorage.setItem("pr_city", next);
      return next;
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // GAME
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <CasinoBackground
        city={city}
        cheering={state?.phase === "ended"}
        players={state?.players ?? []}
        gameActive={state?.phase === "playing"}
        reactionTrigger={cardPlayCount}
        lossTarget={lossTarget}
        dateImageUrl={equippedDate?.thumbnailUrl}
      />
      <div className="relative z-10 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/92 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-white font-black text-lg">Property</span>
          <span className="text-indigo-400 font-black text-lg">Rush</span>
        </div>

        <div className="flex items-center gap-1.5">
          {reconnecting && <span className="text-yellow-400 text-xs animate-pulse">⟳</span>}
          <span className="text-slate-600 text-xs font-mono">{roomId}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cycleCity}
            className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-sm transition-colors"
            title="Change casino scene"
          >
            🌆
          </button>
          <button
            onClick={() => setSoundOn((v) => !v)}
            className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-sm transition-colors"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          {soundOn && <MusicPlayer city={city} enabled={soundOn} onToggle={() => setSoundOn((v) => !v)} />}
          <button
            onClick={() => { if (window.confirm("Leave the game? Your progress will be lost.")) router.push("/"); }}
            className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-red-900/60 border border-white/10 text-slate-500 hover:text-red-400 text-xs transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <GameBoard state={state} myId={myId} onMove={handleMove} error={moveError} equippedDate={equippedDate} />
      </div>
      </div>
    </div>
  );
}
