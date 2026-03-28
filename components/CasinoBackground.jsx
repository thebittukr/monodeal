"use client";
import { useEffect, useState } from "react";

export const CITY_CONFIGS = {
  lasvegas:   { label: "Las Vegas",        neons: ["#ffd700","#ff6600","#ff3333"] },
  tokyo:      { label: "Tokyo",            neons: ["#ff2d78","#bf5fff","#ff69b4"] },
  macau:      { label: "Macau",            neons: ["#ff1a1a","#ffd700","#ff8c00"] },
  montecarlo: { label: "Monte Carlo",      neons: ["#4169e1","#b0c4de","#00bfff"] },
  singapore:  { label: "Singapore",        neons: ["#00ff88","#00cfff","#ff00aa"] },
  atlantic:   { label: "Atlantic City",    neons: ["#9400d3","#00ffff","#ff007f"] },
  badenbaden: { label: "Baden-Baden",      neons: ["#ffa500","#ffd700","#daa520"] },
  sanjose:    { label: "San Jose",         neons: ["#44ff44","#ffd700","#ff6a00"] },
  paradise:   { label: "Paradise Island",  neons: ["#00ffff","#ff69b4","#ffd700"] },
  london:     { label: "London",           neons: ["#ff4500","#ffd700","#dc143c"] },
  sydney:     { label: "Sydney",           neons: ["#ff8c00","#00aaff","#00ff7f"] },
};

const CARD_REACT_LINES = [
  "Ooh, bold move!", "Yes! Play it!", "That's the one!",
  "Make them pay!", "I love this!", "Go go go!",
  "The drama!", "Iconic!", "They won't recover!",
];
const LOSS_LINES = [
  "Sorry for your loss, honey", "Don't give up!", "They got lucky",
  "Shake it off!", "Pain is temporary, victory is forever",
];

export default function CasinoBackground({
  city = "lasvegas",
  cheering = false,
  players = [],
  gameActive = false,
  reactionTrigger = 0,
  lossTarget = -1,
}) {
  const [bubble, setBubble] = useState("");
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    if (!reactionTrigger) return;
    const line = CARD_REACT_LINES[Math.floor(Math.random() * CARD_REACT_LINES.length)];
    setBubble(line);
    setShowBubble(true);
    const t = setTimeout(() => setShowBubble(false), 3500);
    return () => clearTimeout(t);
  }, [reactionTrigger]);

  useEffect(() => {
    if (lossTarget < 0) return;
    const line = LOSS_LINES[Math.floor(Math.random() * LOSS_LINES.length)];
    setBubble(line);
    setShowBubble(true);
    const t = setTimeout(() => setShowBubble(false), 4000);
    return () => clearTimeout(t);
  }, [lossTarget]);

  const cfg = CITY_CONFIGS[city] || CITY_CONFIGS.lasvegas;
  const [c1, c2, c3] = cfg.neons;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{
        position: "absolute", inset: 0,
        background: cheering
          ? `radial-gradient(ellipse 90% 60% at 20% 100%, ${c1}55 0%, transparent 55%), radial-gradient(ellipse 90% 60% at 80% 100%, ${c2}55 0%, transparent 55%), linear-gradient(180deg, #010108 0%, #060012 60%, #0d0020 100%)`
          : `radial-gradient(ellipse 70% 50% at 15% 100%, ${c1}30 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 100%, ${c2}30 0%, transparent 55%), linear-gradient(180deg, #010108 0%, #04010e 60%, #080018 100%)`,
      }} />

      {/* Desktop: Date character in white card */}
      <div className="hidden sm:block" style={{ position: "fixed", bottom: 10, right: 10, zIndex: 25, pointerEvents: "none" }}>
        <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", width: 220 }}>
          <img src="https://pub-3b44ace66a3b4c17af6fa229197f3026.r2.dev/dates/strawberry.gif" alt="" style={{ width: "100%", display: "block" }} />
        </div>
        {showBubble && (
          <div style={{
            position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
            background: "rgba(15,10,30,0.93)", border: "1px solid rgba(180,130,255,0.35)",
            borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 600,
            color: "#ead8ff", whiteSpace: "nowrap", zIndex: 30,
          }}>
            {bubble}
          </div>
        )}
      </div>

      {/* Mobile */}
      <div className="sm:hidden" style={{ position: "fixed", bottom: 5, right: 5, zIndex: 25, pointerEvents: "none" }}>
        <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)", width: 100 }}>
          <img src="https://pub-3b44ace66a3b4c17af6fa229197f3026.r2.dev/dates/strawberry.gif" alt="" style={{ width: "100%", display: "block" }} />
        </div>
      </div>
    </div>
  );
}
