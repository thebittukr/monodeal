"use client";
import { COLORS } from "@/lib/cards";

// ── Color palette ─────────────────────────────────────────────────────────────
const COLOR_THEME = {
  brown:     { bg:"#7c4a1e", band:"#5c3212", text:"#ffd8a0", dot:"#92400e",  label:"Brown"     },
  lightblue: { bg:"#0e7ab8", band:"#0a5e8e", text:"#d0f0ff", dot:"#0ea5e9",  label:"Light Blue" },
  pink:      { bg:"#c0206c", band:"#a01858", text:"#ffe0f0", dot:"#ec4899",  label:"Pink"       },
  orange:    { bg:"#c44a00", band:"#a03500", text:"#ffe0b0", dot:"#f97316",  label:"Orange"     },
  red:       { bg:"#b01212", band:"#8a0c0c", text:"#ffd0d0", dot:"#ef4444",  label:"Red"        },
  yellow:    { bg:"#b08800", band:"#8a6600", text:"#fff8c0", dot:"#eab308",  label:"Yellow"     },
  green:     { bg:"#0a7a28", band:"#076020", text:"#c8ffd0", dot:"#22c55e",  label:"Green"      },
  blue:      { bg:"#0a38c0", band:"#082ba0", text:"#c0d8ff", dot:"#3b82f6",  label:"Blue"       },
  railroad:  { bg:"#3a3a4a", band:"#28282e", text:"#dde4ee", dot:"#6b7280",  label:"Railroad"   },
  utility:   { bg:"#0a6a68", band:"#085058", text:"#c0f8f5", dot:"#14b8a6",  label:"Utility"    },
};

const ACTION_ICONS = {
  passgo:        "🚀", debtcollector: "💸", birthday:      "🎂",
  slydeal:       "🦊", dealbreaker:   "💣", doublerent:    "✖️",
  justsayno:     "🚫", identityswap:  "🔄", taxtherich:    "🏛️",
  timewarp:      "⏳", chaoscard:     "🌀", forceddeal:    "⚡",
  wreckingball:  "🔨", propertytax:   "📋", secondchance:  "🔁",
  rent:          "🏠",
};

const MONEY_COLORS = {
  1:  { bg:"#c8e8b0", dark:"#4a7a28", light:"#eafcd8" },
  2:  { bg:"#b0d4f0", dark:"#2a5a8a", light:"#d8edff" },
  3:  { bg:"#f0d0b0", dark:"#8a5020", light:"#fff0d8" },
  4:  { bg:"#d8b0e8", dark:"#5a2a8a", light:"#f4e0ff" },
  5:  { bg:"#f0b0b0", dark:"#8a2020", light:"#ffd8d8" },
  10: { bg:"#f0e8a0", dark:"#8a7a10", light:"#fffcd8" },
};

// ── Rent table mini (property card bottom) ────────────────────────────────────
function RentTable({ color, small }) {
  const col = COLORS[color];
  if (!col || small) return null;
  return (
    <div className="w-full px-1 pb-0.5">
      <div className="rounded overflow-hidden border border-black/20">
        <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${col.rents.length},1fr)`, fontSize:6 }}>
          {col.rents.map((r,i) => (
            <div key={i} className={`py-0.5 ${i===col.rents.length-1 ? 'bg-yellow-400 text-black font-black' : 'bg-white/20 text-white'}`}
              style={{ borderRight: i<col.rents.length-1 ? '1px solid rgba(0,0,0,0.2)' : 'none' }}>
              {i===0 ? '–' : `$${r}M`}
            </div>
          ))}
        </div>
        <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${col.rents.length},1fr)`, fontSize:5, background:'rgba(0,0,0,0.25)' }}>
          {col.rents.map((_,i) => (
            <div key={i} className="py-0.5 text-white/50" style={{ borderRight: i<col.rents.length-1 ? '1px solid rgba(0,0,0,0.15)' : 'none' }}>
              {i===0 ? '0' : i}🏠
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Property card ─────────────────────────────────────────────────────────────
function PropertyCard({ card, small, selected, dimmed, onClick }) {
  const theme = COLOR_THEME[card.color] || COLOR_THEME.brown;
  const rents = COLORS[card.color]?.rents ?? [];
  const maxRent = rents[rents.length - 1] ?? 0;

  return (
    <div
      onClick={onClick}
      className={`flex flex-col flex-shrink-0 select-none cursor-pointer rounded-xl overflow-hidden shadow-2xl
        transition-all duration-150 card-3d
        ${small ? "w-[42px] h-[59px]" : "w-[75px] h-[105px]"}
        ${selected ? "card-3d-selected ring-2 ring-yellow-300 ring-offset-1" : ""}
        ${dimmed ? "opacity-40 pointer-events-none" : ""}
      `}
      style={{ background: theme.bg, border: `2px solid ${theme.band}` }}
    >
      {/* Color band header */}
      <div className="flex items-center justify-between px-1" style={{ background:theme.band, minHeight: small?14:18 }}>
        <span className="font-black text-white leading-none truncate" style={{ fontSize: small?5:8 }}>
          {theme.label.toUpperCase()}
        </span>
        {!small && (
          <span className="font-black text-white/90 leading-none" style={{ fontSize:8 }}>${card.value}M</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-between py-0.5 px-0.5">
        {/* Property name */}
        <div className="text-center w-full px-0.5 flex-1 flex items-center justify-center">
          <div className="font-bold leading-tight text-center" style={{ fontSize:small?5:7.5, color:theme.text, textShadow:'0 1px 2px rgba(0,0,0,0.5)', lineHeight:'1.15' }}>
            {card.name}
          </div>
        </div>

        {/* Rent table */}
        {!small && <RentTable color={card.color} />}

        {/* Max rent badge */}
        {!small && (
          <div className="text-center pb-0.5">
            <span className="bg-yellow-400 text-black font-black rounded px-1" style={{ fontSize:7 }}>
              MAX ${maxRent}M
            </span>
          </div>
        )}
      </div>

      {/* Bottom label */}
      {!small && (
        <div className="text-center py-0.5" style={{ background:'rgba(0,0,0,0.3)' }}>
          <span className="text-white/60 uppercase tracking-widest font-bold" style={{ fontSize:5 }}>PROPERTY</span>
        </div>
      )}
    </div>
  );
}

// ── Wild property card ────────────────────────────────────────────────────────
function WildPropertyCard({ card, small, selected, dimmed, onClick }) {
  const cols = card.colors ?? Object.keys(COLOR_THEME).slice(0, 5);
  const isAny = !card.colors;

  // Build gradient from the card's colors
  const stops = cols.map((c, i) => {
    const pct = (i / (cols.length - 1 || 1)) * 100;
    return `${COLOR_THEME[c]?.bg ?? '#888'} ${pct}%`;
  });
  const gradStyle = { background: `linear-gradient(135deg, ${stops.join(', ')})` };

  return (
    <div
      onClick={onClick}
      className={`flex flex-col flex-shrink-0 select-none cursor-pointer rounded-xl overflow-hidden shadow-2xl
        transition-all duration-150 card-3d
        ${small ? "w-[42px] h-[59px]" : "w-[75px] h-[105px]"}
        ${selected ? "card-3d-selected ring-2 ring-white ring-offset-1" : ""}
        ${dimmed ? "opacity-40 pointer-events-none" : ""}
      `}
      style={{ ...gradStyle, border:'2px solid rgba(255,255,255,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-0.5" style={{ background:'rgba(0,0,0,0.4)', minHeight: small?14:18 }}>
        <span className="font-black text-white leading-none" style={{ fontSize:small?5:7 }}>WILD</span>
        {!small && <span className="text-white/80 font-bold" style={{ fontSize:7 }}>${card.value}M</span>}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-1 gap-0.5">
        {!small && <div className="text-white font-black text-center" style={{ fontSize:9, textShadow:'0 0 8px rgba(0,0,0,0.8)' }}>★ WILD ★</div>}

        {/* Color dots */}
        <div className="flex flex-wrap gap-0.5 justify-center">
          {cols.slice(0, isAny ? 8 : undefined).map((c) => (
            <span key={c} className="rounded-full border border-white/40 shadow"
              style={{ width:small?4:7, height:small?4:7, background:COLOR_THEME[c]?.dot ?? '#888' }} />
          ))}
          {isAny && <span className="rounded-full border border-white/40" style={{ width:7, height:7, background:'#ccc' }} />}
        </div>

        {!small && (
          <div className="text-white/80 text-center leading-tight" style={{ fontSize:6.5 }}>
            {isAny ? "ANY COLOR" : cols.map(c => COLOR_THEME[c]?.label?.split(' ')[0]).join('/')}
          </div>
        )}
      </div>

      {!small && (
        <div className="text-center py-0.5" style={{ background:'rgba(0,0,0,0.35)' }}>
          <span className="text-white/60 font-bold uppercase tracking-widest" style={{ fontSize:5 }}>WILD PROP</span>
        </div>
      )}
    </div>
  );
}

// ── Money / Cash card ─────────────────────────────────────────────────────────
function MoneyCard({ card, small, selected, dimmed, onClick }) {
  const theme = MONEY_COLORS[card.value] ?? MONEY_COLORS[1];

  return (
    <div
      onClick={onClick}
      className={`flex flex-col flex-shrink-0 select-none cursor-pointer rounded-xl overflow-hidden shadow-2xl
        transition-all duration-150 card-3d relative
        ${small ? "w-[42px] h-[59px]" : "w-[75px] h-[105px]"}
        ${selected ? "card-3d-selected ring-2 ring-yellow-300 ring-offset-1" : ""}
        ${dimmed ? "opacity-40 pointer-events-none" : ""}
      `}
      style={{ background: `linear-gradient(160deg, ${theme.light} 0%, ${theme.bg} 50%, ${theme.dark} 100%)`,
               border:`2px solid ${theme.dark}` }}
    >
      {/* Ornate border overlay */}
      {!small && (
        <div className="absolute inset-1 rounded-lg pointer-events-none" style={{ border:`1px dashed ${theme.dark}55` }} />
      )}

      {/* Top strip */}
      <div className="flex items-center justify-center py-0.5 px-1" style={{ background:theme.dark, minHeight:small?14:16 }}>
        {small ? (
          <span className="font-black text-white" style={{ fontSize:6 }}>${card.value}M</span>
        ) : (
          <span className="font-bold text-white/80 uppercase tracking-widest" style={{ fontSize:5.5 }}>PROPERTY RUSH BANK</span>
        )}
      </div>

      {/* Main body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1">
        {/* Big denomination */}
        <div className="font-black text-center leading-none" style={{ fontSize:small?11:22, color:theme.dark, textShadow:`0 2px 4px rgba(0,0,0,0.18)` }}>
          ${card.value}<span style={{ fontSize:small?7:12 }}>M</span>
        </div>
        {!small && (
          <div className="font-bold text-center" style={{ fontSize:7, color:theme.dark+'cc' }}>
            MILLION
          </div>
        )}

        {/* Mini dollar signs decoration */}
        {!small && (
          <div className="flex gap-1 opacity-40" style={{ fontSize:7, color:theme.dark }}>
            <span>$</span><span>$</span><span>$</span>
          </div>
        )}
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-between px-1" style={{ background:theme.dark, minHeight:small?8:14 }}>
        {!small && <>
          <span className="font-black text-white" style={{ fontSize:8 }}>${card.value}M</span>
          <span className="text-white/60 font-bold uppercase tracking-widest" style={{ fontSize:5 }}>CASH</span>
          <span className="font-black text-white" style={{ fontSize:8 }}>${card.value}M</span>
        </>}
      </div>
    </div>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({ card, small, selected, dimmed, onClick }) {
  const icon = ACTION_ICONS[card.action] ?? "⚡";

  // Color by action type
  const actionThemes = {
    passgo:       { grad:"from-sky-600 to-blue-800",     band:"#0a4a8a" },
    debtcollector:{ grad:"from-amber-600 to-orange-800", band:"#8a4a00" },
    birthday:     { grad:"from-pink-500 to-rose-700",    band:"#8a1840" },
    slydeal:      { grad:"from-orange-500 to-red-700",   band:"#8a2200" },
    dealbreaker:  { grad:"from-red-600 to-rose-900",     band:"#7a0808" },
    doublerent:   { grad:"from-green-600 to-teal-800",   band:"#064a30" },
    justsayno:    { grad:"from-slate-500 to-gray-800",   band:"#282830" },
    identityswap: { grad:"from-violet-600 to-purple-900",band:"#3a0a6a" },
    taxtherich:   { grad:"from-amber-700 to-yellow-900", band:"#6a4a00" },
    timewarp:     { grad:"from-cyan-600 to-indigo-800",  band:"#0a286a" },
    chaoscard:    { grad:"from-fuchsia-600 to-purple-800",band:"#5a0a7a" },
    forceddeal:   { grad:"from-rose-600 to-red-800",     band:"#7a0a1a" },
    wreckingball: { grad:"from-orange-700 to-red-900",   band:"#6a1a00" },
    propertytax:  { grad:"from-teal-600 to-cyan-800",    band:"#065a60" },
    secondchance: { grad:"from-emerald-600 to-green-800",band:"#0a4a20" },
    rent:         { grad:"from-violet-600 to-purple-800",band:"#3a0a6a" },
  };
  const theme = actionThemes[card.action] ?? { grad:"from-sky-600 to-indigo-800", band:"#0a2878" };

  return (
    <div
      onClick={onClick}
      className={`flex flex-col flex-shrink-0 select-none cursor-pointer rounded-xl overflow-hidden shadow-2xl
        transition-all duration-150 card-3d bg-gradient-to-br ${theme.grad}
        ${small ? "w-[42px] h-[59px]" : "w-[75px] h-[105px]"}
        ${selected ? "card-3d-selected ring-2 ring-white ring-offset-1" : ""}
        ${dimmed ? "opacity-40 pointer-events-none" : ""}
      `}
      style={{ border:`2px solid ${theme.band}` }}
    >
      {/* Top strip */}
      <div className="flex items-center justify-between px-1" style={{ background:'rgba(0,0,0,0.35)', minHeight: small?14:16 }}>
        <span className="text-white/80 font-bold uppercase tracking-wider truncate" style={{ fontSize: small?5:6.5 }}>
          {small ? '' : card.type === 'rent' ? 'RENT' : 'ACTION'}
        </span>
        {!small && <span className="text-white/70 font-bold" style={{ fontSize:7 }}>${card.value}M</span>}
      </div>

      {/* Icon */}
      <div className="flex items-center justify-center" style={{ minHeight: small?16:28 }}>
        <span style={{ fontSize: small?14:22, lineHeight:1 }}>{icon}</span>
      </div>

      {/* Name + desc */}
      <div className="flex-1 flex flex-col items-center justify-center px-1 gap-0.5">
        <div className="text-white font-black text-center leading-tight" style={{ fontSize:small?5:8, textShadow:'0 1px 3px rgba(0,0,0,0.6)' }}>
          {card.name}
        </div>
        {!small && card.desc && (
          <div className="text-white/75 text-center leading-tight" style={{ fontSize:6 }}>
            {card.desc}
          </div>
        )}
      </div>

      {/* Rent: color dots */}
      {card.type === 'rent' && !small && (
        <div className="flex gap-1 justify-center pb-1">
          {(card.colors ? card.colors : Object.keys(COLOR_THEME).slice(0,5)).map((c) => (
            <span key={c} className="rounded-full border border-white/40 shadow"
              style={{ width:8, height:8, background:COLOR_THEME[c]?.dot ?? '#888', display:'inline-block' }} />
          ))}
          {!card.colors && <span className="text-yellow-300 font-black" style={{ fontSize:7 }}>★ALL</span>}
        </div>
      )}

      {/* Bottom */}
      {!small && (
        <div className="text-center py-0.5" style={{ background:'rgba(0,0,0,0.3)' }}>
          <span className="text-white/55 uppercase tracking-widest font-bold" style={{ fontSize:5 }}>
            {card.type === 'rent' ? 'RENT' : 'ACTION'}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Hidden (face-down) card ────────────────────────────────────────────────────
function HiddenCard({ small }) {
  return (
    <div className={`flex-shrink-0 rounded-xl overflow-hidden shadow-lg
      ${small ? "w-[42px] h-[59px]" : "w-[75px] h-[105px]"}
    `}
      style={{
        background:'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        border:'2px solid #2a2a4a',
      }}
    >
      {/* Card back pattern */}
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
        {/* Diamond grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 72 100">
          {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
            <rect key={`${row}-${col}`}
              x={col*24+12} y={row*16+8} width={10} height={10}
              transform={`rotate(45 ${col*24+17} ${row*16+13})`}
              fill="none" stroke="#c9a227" strokeWidth="0.8" />
          )))}
        </svg>
        <div style={{ fontSize:small?14:22 }} className="select-none relative z-10">🃏</div>
      </div>
    </div>
  );
}

// ── Main export (memoized — prevents re-renders when card data unchanged) ────
import { memo } from "react";

const Card = memo(function Card({ card, onClick, selected, small, dimmed }) {
  if (!card) return null;

  const props = { card, onClick, selected, small, dimmed };

  if (card.type === 'hidden') return <HiddenCard small={small} />;

  if (card.type === 'money') return <MoneyCard {...props} />;

  if (card.type === 'property') return <PropertyCard {...props} />;

  // Placed wild shows as property color
  if (card.type === 'wildproperty' && card.color) {
    return <PropertyCard {...props} />;
  }

  if (card.type === 'wildproperty') return <WildPropertyCard {...props} />;

  // action / rent
  return <ActionCard {...props} />;
});

export default Card;
