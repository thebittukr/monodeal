"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import GameBoard from "@/components/GameBoard";

const POLL_INTERVAL = 1000;
const MAX_PLAYERS   = 4;

export default function RoomPage() {
  const { roomId } = useParams();
  const router     = useRouter();

  const [myId,        setMyId]        = useState(null);
  const [state,       setState]       = useState(null);
  const [moveError,   setMoveError]   = useState("");
  const [copied,      setCopied]      = useState(false);
  const [soundOn,     setSoundOn]     = useState(false);
  const [prevPhase,   setPrevPhase]   = useState(null);
  const [prevTurnIdx, setPrevTurnIdx] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);

  const myIdRef    = useRef(null);
  const soundsRef  = useRef(null);
  const failsRef   = useRef(0);           // consecutive poll failures
  const MAX_FAILS  = 10;                  // ~10s of retries before giving up

  // ── Identity ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const pid = sessionStorage.getItem(`pr_${roomId}_pid`);
    if (!pid) { router.push("/"); return; }
    setMyId(pid);
    myIdRef.current = pid;
  }, [roomId, router]);

  // ── Sound module (lazy) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!soundOn) return;
    import("@/lib/sounds").then((m) => {
      soundsRef.current = m;
      m.setMusicEnabled(true);
    });
    return () => soundsRef.current?.stopMusic?.();
  }, [soundOn]);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    let interval;

    const poll = async () => {
      try {
        const res  = await fetch(`/api/state?roomId=${roomId}&playerId=${myId}`);
        if (res.ok) {
          failsRef.current = 0;
          setReconnecting(false);
          const data = await res.json();
          setState(data);
        } else {
          failsRef.current += 1;
          if (failsRef.current >= MAX_FAILS) {
            // Only give up after 10 consecutive failures (~10s)
            router.push("/");
          } else {
            setReconnecting(true);
          }
        }
      } catch {
        failsRef.current += 1;
        if (failsRef.current >= MAX_FAILS) router.push("/");
        else setReconnecting(true);
      }
    };

    poll();
    interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [myId, roomId, router]);

  // ── SFX triggers on state changes ────────────────────────────────────────
  useEffect(() => {
    if (!state || !soundsRef.current) return;
    const s = soundsRef.current;

    if (state.phase === "ended" && prevPhase !== "ended") s.sfxWin?.();
    else if (state.turnIndex !== prevTurnIdx)              s.sfxCardDraw?.();

    setPrevPhase(state.phase);
    setPrevTurnIdx(state.turnIndex);
  }, [state, prevPhase, prevTurnIdx]);

  // ── Move ──────────────────────────────────────────────────────────────────
  const handleMove = useCallback(async (move) => {
    setMoveError("");
    soundsRef.current?.sfxCardPlay?.();
    try {
      const res  = await fetch("/api/playMove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerId: myIdRef.current, move }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e) {
      setMoveError(e.message);
      setTimeout(() => setMoveError(""), 4000);
    }
  }, [roomId]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WAITING ROOM
  // ─────────────────────────────────────────────────────────────────────────
  if (!state || state.phase === "waiting") {
    const joined    = state?.players?.length ?? 1;
    const needed    = MAX_PLAYERS - joined;
    const players   = state?.players ?? [];

    return (
      <div className="min-h-full felt-bg flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-slate-800/80 backdrop-blur border border-white/10 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3 animate-bounce-sm">⏳</div>
            <h2 className="text-white font-black text-2xl">Waiting for players</h2>
            <p className="text-slate-400 text-sm mt-1">
              {needed > 0
                ? `Need ${needed} more player${needed > 1 ? "s" : ""} to start`
                : "Starting game…"
              }
            </p>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mb-6">
            {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  i < joined ? "bg-emerald-400" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Player list */}
          <div className="space-y-2 mb-6">
            {Array.from({ length: MAX_PLAYERS }).map((_, i) => {
              const p = players[i];
              return (
                <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${p ? "bg-white/5 border border-white/10" : "border border-dashed border-white/10"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    p ? "bg-indigo-600/70 text-white" : "bg-slate-800 text-slate-600"
                  }`}>
                    {p ? p.name[0].toUpperCase() : i + 1}
                  </div>
                  <span className={p ? "text-white font-medium text-sm" : "text-slate-600 text-sm"}>
                    {p ? p.name : `Player ${i + 1}`}
                  </span>
                  {p && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                </div>
              );
            })}
          </div>

          {/* Room code */}
          <div
            onClick={handleCopy}
            className="flex items-center justify-center gap-3 bg-slate-900/80 border border-indigo-500/30 rounded-2xl py-4 px-6 cursor-pointer hover:border-indigo-400/50 transition-colors mb-2"
          >
            <span className="text-indigo-300 font-mono font-black text-2xl tracking-widest">{roomId}</span>
            <span className="text-slate-500">{copied ? "✓" : "📋"}</span>
          </div>
          <p className="text-slate-500 text-xs text-center mb-4">{copied ? "Copied!" : "Share this code with friends"}</p>

          <div className="flex items-center gap-2 justify-center">
            <div className={`w-2 h-2 rounded-full ${reconnecting ? "bg-yellow-400" : "bg-emerald-400"} animate-pulse`} />
            <span className="text-slate-400 text-xs">
              {reconnecting ? "Reconnecting…" : "Auto-starts when all 4 join"}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (window.confirm("Leave the room?")) router.push("/");
          }}
          className="mt-4 text-slate-600 hover:text-slate-400 text-sm transition-colors"
        >
          ← Leave Room
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GAME
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full felt-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-white font-black text-lg">Property</span>
          <span className="text-indigo-400 font-black text-lg">Rush</span>
        </div>
        <div className="flex items-center gap-1.5">
          {reconnecting && (
            <span className="text-yellow-400 text-xs animate-pulse">⟳ reconnecting</span>
          )}
          <span className="text-slate-600 text-xs font-mono">{roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn((v) => !v)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-sm transition-colors"
            title={soundOn ? "Mute music" : "Enable music"}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            onClick={() => {
              if (window.confirm("Leave the game? Your progress will be lost.")) {
                router.push("/");
              }
            }}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-900/60 border border-white/10 text-slate-500 hover:text-red-400 text-xs transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <GameBoard state={state} myId={myId} onMove={handleMove} error={moveError} />
      </div>
    </div>
  );
}
