"use client";
/**
 * IntroOverlay — full-screen interstitial shown right before entering a room.
 * Character delivers a hype line via speech-bubble. Auto-advances after 4s or on tap.
 */
import { useEffect, useRef, useState, useCallback } from "react";

const HYPE_LINES = [
  "Honey, you have to win for me!",
  "Don't you dare lose, darling!",
  "I'm counting on you, gorgeous!",
  "Win this one for me, baby!",
  "Make them regret showing up!",
  "You've got this — now go get it!",
  "I believe in you. Don't let me down!",
];

export default function IntroOverlay({ onDone }) {
  const [line] = useState(() => HYPE_LINES[Math.floor(Math.random() * HYPE_LINES.length)]);
  const [showBubble, setShowBubble] = useState(false);
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  const advance = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const t1 = setTimeout(() => setShowBubble(true), 600);
    const t2 = setTimeout(advance, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [advance]);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / 4500) * 100);
      setProgress(p);
      if (p >= 100) clearInterval(tick);
    }, 40);
    return () => clearInterval(tick);
  }, []);

  return (
    <div
      onClick={advance}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(2,0,12,0.96)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 80%, rgba(100,40,180,0.25) 0%, transparent 70%)",
      }} />

      {/* Character image */}
      <div style={{ position: "relative", width: 250, flexShrink: 0 }}>
        <img src="https://pub-3b44ace66a3b4c17af6fa229197f3026.r2.dev/dates/strawberry.gif" alt="" style={{ width: "100%" }} />

        {/* Speech bubble */}
        <div style={{
          position: "absolute", top: -40, left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15,8,35,0.96)",
          border: "1.5px solid rgba(200,140,255,0.5)",
          borderRadius: 16, padding: "10px 16px",
          fontSize: 15, fontWeight: 700, color: "#f0d8ff",
          whiteSpace: "nowrap", pointerEvents: "none",
          opacity: showBubble ? 1 : 0,
          transition: "opacity 0.5s ease",
          boxShadow: "0 4px 24px rgba(140,60,255,0.35)",
          zIndex: 10,
        }}>
          {line}
          <div style={{
            position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
            borderTop: "9px solid rgba(200,140,255,0.5)",
          }} />
        </div>
      </div>

      <p style={{ marginTop: 18, fontSize: 12, color: "rgba(200,160,255,0.5)", letterSpacing: "0.08em" }}>
        Tap anywhere to continue
      </p>

      <div style={{ marginTop: 14, width: 180, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #c084fc)", borderRadius: 99 }} />
      </div>
    </div>
  );
}
