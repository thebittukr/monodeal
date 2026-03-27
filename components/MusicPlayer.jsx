"use client";
import { useEffect, useState, useRef } from "react";
import { getMusicPlayer } from "@/lib/pixabayMusic";

export default function MusicPlayer({ city, enabled, onToggle }) {
  const [track,   setTrack]   = useState(null);
  const [vol,     setVol]     = useState(35);
  const [loading, setLoading] = useState(false);
  const playerRef = useRef(null);

  // Init player
  useEffect(() => {
    if (typeof window === "undefined") return;
    playerRef.current = getMusicPlayer();
    playerRef.current.onTrackChange = (t) => setTrack(t);
  }, []);

  // Load new city playlist when city changes
  useEffect(() => {
    if (!enabled || !city || typeof window === "undefined") return;
    const p = getMusicPlayer();
    setLoading(true);
    p.loadCity(city).then(() => setLoading(false));
  }, [city, enabled]);

  // Start/stop on toggle
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = getMusicPlayer();
    if (enabled) {
      if (!p.playing) {
        p.play();
        if (!p.city || p.city !== city) {
          setLoading(true);
          p.loadCity(city ?? "lasvegas").then(() => setLoading(false));
        }
      }
    } else {
      p.stop();
    }
  }, [enabled]); // eslint-disable-line

  if (!enabled) return null;

  const title = loading ? "Loading…" : (track?.title ?? "Starting…");
  const artist = track?.artist ?? "Pixabay";

  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 min-w-0">
      {/* Animated bars */}
      <div className="flex items-end gap-0.5 flex-shrink-0" style={{ height: 14 }}>
        {[0,1,2].map((i) => (
          <div
            key={i}
            className="w-0.5 rounded-full"
            style={{
              height: loading ? 4 : undefined,
              background: "#818cf8",
              animation: loading ? "none" : `musicBar ${0.6 + i * 0.2}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.15}s`,
              minHeight: 3,
              maxHeight: 14,
            }}
          />
        ))}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0 max-w-36">
        <div className="text-white/90 text-xs font-semibold truncate leading-none">{title}</div>
        <div className="text-slate-500 text-xs truncate leading-none mt-0.5">{artist}</div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => { getMusicPlayer().prev(); }} className="text-slate-400 hover:text-white text-xs transition-colors" title="Previous">⏮</button>
        <button onClick={() => { getMusicPlayer().next(); }} className="text-slate-400 hover:text-white text-xs transition-colors" title="Next">⏭</button>
        <button onClick={onToggle} className="text-slate-400 hover:text-red-400 text-xs transition-colors" title="Stop music">⏹</button>
      </div>
    </div>
  );
}
