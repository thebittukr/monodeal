"use client";
import { COLORS } from "@/lib/cards";

// ─── Color config ─────────────────────────────────────────────────────────────
const COLOR_STYLES = {
  brown:  { gradient: "from-amber-700 to-amber-900", border: "border-amber-500", dot: "#92400e" },
  blue:   { gradient: "from-blue-500 to-blue-700",   border: "border-blue-400",  dot: "#3b82f6" },
  red:    { gradient: "from-red-500 to-red-700",     border: "border-red-400",   dot: "#ef4444" },
  green:  { gradient: "from-green-500 to-green-700", border: "border-green-400", dot: "#22c55e" },
  yellow: { gradient: "from-yellow-400 to-yellow-600", border: "border-yellow-300", dot: "#eab308" },
  orange: { gradient: "from-orange-500 to-orange-700", border: "border-orange-400", dot: "#f97316" },
};

const TYPE_CONFIG = {
  money:    { gradient: "from-emerald-400 to-emerald-700", border: "border-emerald-300", label: "MONEY"    },
  action:   { gradient: "from-sky-500 to-indigo-700",      border: "border-sky-400",     label: "ACTION"   },
  rent:     { gradient: "from-violet-500 to-purple-800",   border: "border-violet-400",  label: "RENT"     },
  hidden:   { gradient: "from-slate-600 to-slate-800",     border: "border-slate-500",   label: ""         },
  property: { gradient: "", border: "", label: "PROPERTY" },
};

export default function Card({ card, onClick, selected, small, dimmed }) {
  if (!card) return null;

  const isHidden = card.type === "hidden";

  if (isHidden) {
    return (
      <div
        className={`
          ${small ? "w-10 h-14" : "w-[72px] h-[100px]"}
          rounded-xl border-2 border-slate-600
          bg-gradient-to-br from-slate-700 to-slate-900
          flex items-center justify-center shadow-lg flex-shrink-0
        `}
      >
        <div className="text-2xl opacity-40 select-none">🃏</div>
      </div>
    );
  }

  // Determine visual style
  const isProperty = card.type === "property";
  const colorStyle = isProperty ? COLOR_STYLES[card.color] : null;
  const typeConf   = isProperty ? null : TYPE_CONFIG[card.type] ?? TYPE_CONFIG.action;

  const gradient = isProperty ? colorStyle?.gradient : typeConf?.gradient;
  const border   = isProperty ? colorStyle?.border   : typeConf?.border;

  return (
    <div
      onClick={onClick}
      className={`
        ${small ? "w-10 h-14" : "w-[72px] h-[100px]"}
        rounded-xl border-2 ${border}
        bg-gradient-to-br ${gradient}
        flex flex-col shadow-lg flex-shrink-0
        cursor-pointer select-none
        transition-all duration-150 ease-out
        ${selected
          ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110 -translate-y-3 shadow-2xl"
          : "hover:scale-105 hover:-translate-y-1 hover:shadow-xl"
        }
        ${dimmed ? "opacity-40 pointer-events-none" : ""}
        overflow-hidden relative
      `}
    >
      {/* Top value badge */}
      {!small && card.value != null && (
        <div className="absolute top-1 left-1 bg-black/30 backdrop-blur-sm rounded px-1 text-white font-bold"
          style={{ fontSize: 9 }}>
          ${card.value}M
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-1 pt-3">
        {card.type === "money" ? (
          <div className="text-center">
            <div className="text-white font-black text-xl leading-none drop-shadow">${card.value}M</div>
            <div className="text-white/70 font-semibold mt-0.5" style={{ fontSize: 8 }}>MILLION</div>
          </div>
        ) : card.type === "property" ? (
          <div className="text-center w-full px-1">
            <div className="text-white/60 uppercase font-bold tracking-wider" style={{ fontSize: 7 }}>
              {COLORS[card.color]?.label}
            </div>
            <div className="text-white font-bold leading-tight mt-0.5 text-center break-words" style={{ fontSize: 8 }}>
              {card.name}
            </div>
          </div>
        ) : (
          <div className="text-center w-full px-1">
            <div className="text-white font-bold leading-tight" style={{ fontSize: 9 }}>
              {card.name}
            </div>
            {!small && card.desc && (
              <div className="text-white/70 mt-1 leading-tight" style={{ fontSize: 7 }}>
                {card.desc}
              </div>
            )}
            {card.type === "rent" && card.colors && !small && (
              <div className="flex gap-0.5 justify-center mt-1.5 flex-wrap">
                {card.colors.map((c) => (
                  <span
                    key={c}
                    className="rounded-full w-3 h-3 border border-white/40"
                    style={{ backgroundColor: COLOR_STYLES[c]?.dot }}
                  />
                ))}
              </div>
            )}
            {card.type === "rent" && !card.colors && !small && (
              <div className="text-yellow-300 font-bold mt-1" style={{ fontSize: 7 }}>✦ ANY COLOR</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom type label */}
      {!small && (
        <div className="bg-black/25 text-center py-0.5">
          <span className="text-white/60 uppercase tracking-widest font-bold" style={{ fontSize: 6 }}>
            {isProperty ? "PROPERTY" : card.type.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
