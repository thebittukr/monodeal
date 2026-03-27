"use client";
import { COLORS } from "@/lib/cards";

// Inline color styles so nothing depends on Tailwind dynamic purging
const COLOR_STYLE = {
  brown:     { bg: "#92400e", light: "#fbbf24", text: "#fff" },
  lightblue: { bg: "#0369a1", light: "#7dd3fc", text: "#fff" },
  pink:      { bg: "#be185d", light: "#f9a8d4", text: "#fff" },
  orange:    { bg: "#c2410c", light: "#fdba74", text: "#fff" },
  red:       { bg: "#b91c1c", light: "#fca5a5", text: "#fff" },
  yellow:    { bg: "#a16207", light: "#fde047", text: "#fff" },
  green:     { bg: "#15803d", light: "#86efac", text: "#fff" },
  blue:      { bg: "#1d4ed8", light: "#93c5fd", text: "#fff" },
  railroad:  { bg: "#374151", light: "#9ca3af", text: "#fff" },
  utility:   { bg: "#0f766e", light: "#5eead4", text: "#fff" },
};

export default function AssetDisplay({
  assets = {},
  small = false,
  onCardClick,        // (color, card) → used for targeting (Sly Deal etc.)
  onWildFlip,         // (color, card) → flip wild card to new color (my assets only)
}) {
  const entries = Object.entries(assets).filter(([, cards]) => cards.length > 0);

  if (entries.length === 0) {
    return <p className="text-slate-600 text-xs italic px-2 py-1">No properties yet</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 px-1">
      {entries.map(([color, cards]) => {
        const meta     = COLORS[color];
        const style    = COLOR_STYLE[color] ?? { bg: "#334155", light: "#94a3b8", text: "#fff" };
        const complete = cards.length >= meta.setSize;

        return (
          <div
            key={color}
            className="flex flex-col rounded-xl overflow-hidden flex-shrink-0"
            style={{
              border: `2px solid ${complete ? style.light : style.bg + "88"}`,
              background: "rgba(255,255,255,0.04)",
              boxShadow: complete ? `0 0 10px ${style.bg}55` : "none",
            }}
          >
            {/* Set header bar */}
            <div
              className="flex items-center gap-1.5 px-2 py-1"
              style={{ background: style.bg }}
            >
              <span className="text-white/90 font-bold uppercase tracking-wide" style={{ fontSize: 9 }}>
                {meta.label}
              </span>
              <span className="ml-auto text-white/60" style={{ fontSize: 9 }}>
                {cards.length}/{meta.setSize}
              </span>
              {complete && <span style={{ fontSize: 9 }}>✦</span>}
            </div>

            {/* Cards in set */}
            <div className="flex p-1 gap-1">
              {cards.map((card) => (
                <PropertyMiniCard
                  key={card.id}
                  card={card}
                  color={color}
                  style={style}
                  small={small}
                  onClick={onCardClick ? () => onCardClick(color, card) : undefined}
                  onWildFlip={onWildFlip && card.type === "wildproperty" ? () => onWildFlip(color, card) : undefined}
                />
              ))}

              {/* Empty slot placeholders */}
              {Array.from({ length: Math.max(0, meta.setSize - cards.length) }).map((_, i) => (
                <div
                  key={`slot-${i}`}
                  className="rounded-lg border border-dashed"
                  style={{
                    width: small ? 32 : 52,
                    height: small ? 44 : 72,
                    borderColor: style.bg + "44",
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mini property card ───────────────────────────────────────────────────────
function PropertyMiniCard({ card, color, style, small, onClick, onWildFlip }) {
  const w = small ? 32 : 52;
  const h = small ? 44 : 72;

  return (
    <div
      onClick={onClick}
      className="relative rounded-lg flex flex-col overflow-hidden flex-shrink-0 shadow-md"
      style={{
        width: w,
        height: h,
        background: `linear-gradient(160deg, ${style.bg}, ${style.bg}cc)`,
        border: `1.5px solid ${style.light}66`,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* Color banner */}
      <div className="px-1 pt-0.5" style={{ background: style.light + "33" }}>
        <span className="text-white font-black uppercase tracking-wider leading-none" style={{ fontSize: small ? 5 : 7 }}>
          {COLORS[color]?.label}
        </span>
      </div>

      {/* Name */}
      <div className="flex-1 flex items-center justify-center px-0.5">
        <span
          className="text-white/90 font-semibold text-center leading-tight"
          style={{ fontSize: small ? 5 : 7, wordBreak: "break-word" }}
        >
          {card.name}
        </span>
      </div>

      {/* Value */}
      <div className="text-center pb-0.5">
        <span
          className="text-white font-bold"
          style={{ fontSize: small ? 6 : 8, background: "rgba(0,0,0,0.25)", borderRadius: 2, padding: "0 2px" }}
        >
          ${card.value}M
        </span>
      </div>

      {/* Wild flip button */}
      {onWildFlip && (
        <div
          onClick={(e) => { e.stopPropagation(); onWildFlip(); }}
          title="Move to another color group"
          className="absolute top-0.5 right-0.5 rounded flex items-center justify-center hover:bg-white/30 transition-colors"
          style={{ width: small ? 10 : 14, height: small ? 10 : 14, background: "rgba(0,0,0,0.35)", cursor: "pointer", fontSize: small ? 6 : 8 }}
        >
          ↔
        </div>
      )}
    </div>
  );
}
