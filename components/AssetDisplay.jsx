"use client";
import { COLORS, isSetComplete } from "@/lib/cards";
import Card from "./Card";

// COLOR_DOT ─────────────────────────────────────────────────────────────────────
const DOT_COLORS = {
  brown:  "bg-amber-700",
  blue:   "bg-blue-500",
  red:    "bg-red-500",
  green:  "bg-green-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
};

export default function AssetDisplay({
  assets = {},
  label,
  small = false,
  onCardClick,    // (color, card) => void — for targeting
  highlightComplete = false,
}) {
  const entries = Object.entries(assets).filter(([, cards]) => cards.length > 0);

  if (entries.length === 0) {
    return (
      <div className="text-slate-500 text-xs italic px-2">
        {label ? `${label} has no properties yet` : "No properties yet"}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 px-2">
      {entries.map(([color, cards]) => {
        const colorMeta = COLORS[color];
        const complete  = cards.length >= colorMeta.setSize;
        const dotClass  = DOT_COLORS[color] ?? "bg-slate-400";

        return (
          <div
            key={color}
            className={`
              flex flex-col gap-1 rounded-xl p-2
              ${complete
                ? "bg-white/10 ring-2 ring-white/30 shadow-lg"
                : "bg-white/5"
              }
              transition-all duration-200
            `}
          >
            {/* Set header */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${dotClass} flex-shrink-0`} />
              <span className="text-white/80 text-xs font-semibold">{colorMeta.label}</span>
              <span className="text-white/40 text-xs">
                {cards.length}/{colorMeta.setSize}
              </span>
              {complete && (
                <span className="ml-1 text-yellow-300 text-xs font-bold animate-pulse-slow">✦</span>
              )}
            </div>

            {/* Cards in set */}
            <div className="flex gap-1">
              {cards.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  small={small}
                  onClick={onCardClick ? () => onCardClick(color, card) : undefined}
                />
              ))}
              {/* Placeholder slots */}
              {Array.from({ length: Math.max(0, colorMeta.setSize - cards.length) }).map((_, i) => (
                <div
                  key={`slot-${i}`}
                  className={`
                    ${small ? "w-10 h-14" : "w-[72px] h-[100px]"}
                    rounded-xl border border-dashed border-white/10
                    flex-shrink-0
                  `}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
