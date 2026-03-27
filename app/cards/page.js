"use client";
import { useState } from "react";
import Card from "@/components/Card";
import { COLORS } from "@/lib/cards";
import Link from "next/link";

// Build one of each card type for display
const PROPERTY_CARDS = [
  // Brown
  { id:"d-brown1", type:"property", color:"brown",     name:"Brownstone Ave",      value:1 },
  { id:"d-brown2", type:"property", color:"brown",     name:"Baltic Blvd",          value:1 },
  // Light Blue
  { id:"d-lb1",    type:"property", color:"lightblue", name:"Oriental Lane",        value:1 },
  { id:"d-lb2",    type:"property", color:"lightblue", name:"Vermont Ave",           value:1 },
  { id:"d-lb3",    type:"property", color:"lightblue", name:"Connecticut Blvd",      value:1 },
  // Pink
  { id:"d-pk1",    type:"property", color:"pink",      name:"St Charles Pl",        value:2 },
  { id:"d-pk2",    type:"property", color:"pink",      name:"States Ave",            value:2 },
  { id:"d-pk3",    type:"property", color:"pink",      name:"Virginia St",           value:2 },
  // Orange
  { id:"d-or1",    type:"property", color:"orange",    name:"St James Pl",           value:2 },
  { id:"d-or2",    type:"property", color:"orange",    name:"Tennessee Ave",         value:2 },
  { id:"d-or3",    type:"property", color:"orange",    name:"New York Ave",          value:2 },
  // Red
  { id:"d-re1",    type:"property", color:"red",       name:"Kentucky Ave",          value:3 },
  { id:"d-re2",    type:"property", color:"red",       name:"Indiana Rd",            value:3 },
  { id:"d-re3",    type:"property", color:"red",       name:"Illinois St",           value:3 },
  // Yellow
  { id:"d-ye1",    type:"property", color:"yellow",    name:"Atlantic Blvd",         value:3 },
  { id:"d-ye2",    type:"property", color:"yellow",    name:"Ventnor Ave",           value:3 },
  { id:"d-ye3",    type:"property", color:"yellow",    name:"Marvin Gardens",        value:3 },
  // Green
  { id:"d-gr1",    type:"property", color:"green",     name:"Pacific Ave",           value:4 },
  { id:"d-gr2",    type:"property", color:"green",     name:"North Carolina Ave",    value:4 },
  { id:"d-gr3",    type:"property", color:"green",     name:"Penn Avenue",           value:4 },
  // Blue
  { id:"d-bl1",    type:"property", color:"blue",      name:"Park Place",            value:4 },
  { id:"d-bl2",    type:"property", color:"blue",      name:"Boardwalk",             value:4 },
  // Railroad
  { id:"d-rr1",    type:"property", color:"railroad",  name:"Reading Railroad",      value:2 },
  { id:"d-rr2",    type:"property", color:"railroad",  name:"Penn Railroad",         value:2 },
  { id:"d-rr3",    type:"property", color:"railroad",  name:"B&O Railroad",          value:2 },
  { id:"d-rr4",    type:"property", color:"railroad",  name:"Short Line RR",         value:2 },
  // Utility
  { id:"d-ut1",    type:"property", color:"utility",   name:"Electric Company",      value:2 },
  { id:"d-ut2",    type:"property", color:"utility",   name:"Water Works",           value:2 },
];

const WILD_CARDS = [
  { id:"d-w1",  type:"wildproperty", name:"Property Wild",       colors:null,                    value:4, desc:"ANY color" },
  { id:"d-w2",  type:"wildproperty", name:"Brown/LightBlue Wild", colors:["brown","lightblue"],   value:1, desc:"Brown or Light Blue" },
  { id:"d-w3",  type:"wildproperty", name:"Pink/Orange Wild",     colors:["pink","orange"],       value:2, desc:"Pink or Orange" },
  { id:"d-w4",  type:"wildproperty", name:"Red/Yellow Wild",      colors:["red","yellow"],        value:3, desc:"Red or Yellow" },
  { id:"d-w5",  type:"wildproperty", name:"Green/Blue Wild",      colors:["green","blue"],        value:4, desc:"Green or Blue" },
  { id:"d-w6",  type:"wildproperty", name:"Railroad/Utility Wild",colors:["railroad","utility"],  value:2, desc:"Railroad or Utility" },
];

const MONEY_CARDS = [
  { id:"d-m1",  type:"money", name:"$1M",  value:1 },
  { id:"d-m2",  type:"money", name:"$2M",  value:2 },
  { id:"d-m3",  type:"money", name:"$3M",  value:3 },
  { id:"d-m4",  type:"money", name:"$4M",  value:4 },
  { id:"d-m5",  type:"money", name:"$5M",  value:5 },
  { id:"d-m10", type:"money", name:"$10M", value:10 },
];

const ACTION_CARDS = [
  { id:"d-a1",  type:"action", name:"Pass Go",        action:"passgo",        desc:"Draw 2 extra cards",                              value:1 },
  { id:"d-a2",  type:"action", name:"Debt Collector",  action:"debtcollector", desc:"Collect $5M from any opponent",                   value:3 },
  { id:"d-a3",  type:"action", name:"It's My B-Day!", action:"birthday",      desc:"Collect $2M from ALL opponents",                  value:2 },
  { id:"d-a4",  type:"action", name:"Sly Deal",       action:"slydeal",       desc:"Steal 1 property from an incomplete set",          value:3 },
  { id:"d-a5",  type:"action", name:"Deal Breaker",   action:"dealbreaker",   desc:"Steal a complete property set",                   value:5 },
  { id:"d-a6",  type:"action", name:"Double Rent",    action:"doublerent",    desc:"Next rent card is doubled",                       value:1 },
  { id:"d-a7",  type:"action", name:"Just Say No",    action:"justsayno",     desc:"Cancel any action against you",                   value:4 },
  { id:"d-a8",  type:"action", name:"Identity Swap",  action:"identityswap",  desc:"Swap ALL your assets with an opponent",           value:4 },
  { id:"d-a9",  type:"action", name:"Tax The Rich",   action:"taxtherich",    desc:"Steal half of an opponent's bank",                value:3 },
  { id:"d-a10", type:"action", name:"Time Warp",      action:"timewarp",      desc:"Discard for free — no play cost",                 value:2 },
  { id:"d-a11", type:"action", name:"Chaos Card",     action:"chaoscard",     desc:"ALL hands reshuffled — everyone redraws 5!",      value:2 },
  { id:"d-a12", type:"action", name:"Force Deal",     action:"forceddeal",    desc:"Swap one property with an opponent's",            value:3 },
  { id:"d-a13", type:"action", name:"Wrecking Ball",  action:"wreckingball",  desc:"Demolish an opponent's complete set",             value:4 },
  { id:"d-a14", type:"action", name:"Property Tax",   action:"propertytax",   desc:"Charge $1M per complete set from all opponents",  value:2 },
  { id:"d-a15", type:"action", name:"Second Chance",  action:"secondchance",  desc:"Reclaim the top discard into your hand",          value:1 },
];

const RENT_CARDS = [
  { id:"d-r1", type:"rent", name:"Rent",      action:"rent", colors:["brown","utility"],   desc:"Charge rent for Brown or Utility",   value:1 },
  { id:"d-r2", type:"rent", name:"Rent",      action:"rent", colors:["lightblue","railroad"], desc:"Charge rent for LightBlue or Railroad", value:1 },
  { id:"d-r3", type:"rent", name:"Rent",      action:"rent", colors:["pink","orange"],     desc:"Charge rent for Pink or Orange",     value:1 },
  { id:"d-r4", type:"rent", name:"Rent",      action:"rent", colors:["red","yellow"],      desc:"Charge rent for Red or Yellow",      value:1 },
  { id:"d-r5", type:"rent", name:"Rent",      action:"rent", colors:["green","blue"],      desc:"Charge rent for Green or Blue",      value:1 },
  { id:"d-r6", type:"rent", name:"Wild Rent", action:"rent", colors:null,                  desc:"Charge rent for ANY color",          value:3 },
];

const TABS = [
  { key:"property", label:"🏠 Properties", count:28 },
  { key:"wild",     label:"🌈 Wilds",      count:15 },
  { key:"money",    label:"💵 Cash",       count:20 },
  { key:"action",   label:"⚡ Actions",   count:34 },
  { key:"rent",     label:"🏘️ Rent",      count:13 },
];

const COLOR_GROUPS = {
  brown: "Brown", lightblue: "Light Blue", pink: "Pink", orange: "Orange",
  red: "Red", yellow: "Yellow", green: "Green", blue: "Blue",
  railroad: "Railroad", utility: "Utility",
};

export default function CardsPage() {
  const [tab, setTab] = useState("property");
  const [hovered, setHovered] = useState(null);

  const renderSection = () => {
    switch(tab) {
      case "property":
        // Group by color
        return (
          <div className="space-y-6">
            {Object.entries(COLOR_GROUPS).map(([col, label]) => {
              const cards = PROPERTY_CARDS.filter(c => c.color === col);
              const colorInfo = COLORS[col];
              return (
                <div key={col}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-3 rounded-full w-3" style={{ background:{ brown:'#7c4a1e',lightblue:'#0e7ab8',pink:'#c0206c',orange:'#c44a00',red:'#b01212',yellow:'#b08800',green:'#0a7a28',blue:'#0a38c0',railroad:'#3a3a4a',utility:'#0a6a68' }[col] }} />
                    <h3 className="text-white font-bold">{label}</h3>
                    <span className="text-white/40 text-sm">Set of {colorInfo?.setSize} — Max rent: ${colorInfo?.rents[colorInfo.rents.length-1]}M</span>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {cards.map(c => (
                      <div key={c.id} className="relative group"
                        onMouseEnter={()=>setHovered(c.id)}
                        onMouseLeave={()=>setHovered(null)}>
                        <div className={`transition-transform duration-200 ${hovered===c.id?'-translate-y-3':''}`}>
                          <Card card={c} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      case "wild":
        return (
          <div>
            <p className="text-white/60 mb-4 text-sm">Wild Property cards can be placed in any of their listed color groups. The rainbow "Any Color" wild can join any group!</p>
            <div className="flex gap-3 flex-wrap">
              {WILD_CARDS.map(c => (
                <div key={c.id} className="relative group"
                  onMouseEnter={()=>setHovered(c.id)}
                  onMouseLeave={()=>setHovered(null)}>
                  <div className={`transition-transform duration-200 ${hovered===c.id?'-translate-y-3':''}`}>
                    <Card card={c} />
                  </div>
                  {!c.colors && <div className="mt-1 text-center text-white/60 text-xs">× 5 in deck</div>}
                  {c.colors && <div className="mt-1 text-center text-white/60 text-xs">× 2 in deck</div>}
                </div>
              ))}
            </div>
          </div>
        );
      case "money":
        return (
          <div>
            <p className="text-white/60 mb-4 text-sm">Pay rent, debt, and birthday fees with cash cards. Bank them face-up to build your treasury. Action cards can also be banked for their cash value!</p>
            <div className="flex gap-4 flex-wrap items-end">
              {MONEY_CARDS.map((c,i) => {
                const counts = [6,5,3,3,2,1];
                return (
                  <div key={c.id} className="flex flex-col items-center gap-1">
                    <div className={`transition-transform duration-200 ${hovered===c.id?'-translate-y-3':''}`}
                      onMouseEnter={()=>setHovered(c.id)}
                      onMouseLeave={()=>setHovered(null)}>
                      <Card card={c} />
                    </div>
                    <div className="text-white/50 text-xs">× {counts[i]}</div>
                    <div className="text-yellow-400 font-bold text-sm">${c.value}M</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-white font-bold mb-2">💡 Tip: Bank Action Cards for Cash</h4>
              <p className="text-white/60 text-sm">Any Action or Rent card can be placed in your bank instead of played — it counts as its face value ($1M–$5M) toward paying debts.</p>
            </div>
          </div>
        );
      case "action":
        return (
          <div>
            <p className="text-white/60 mb-4 text-sm">Play up to 3 action cards per turn. Opponents can counter with <strong className="text-white">Just Say No</strong> — and you can counter back!</p>
            <div className="flex gap-3 flex-wrap">
              {ACTION_CARDS.map(c => (
                <div key={c.id} className="relative group"
                  onMouseEnter={()=>setHovered(c.id)}
                  onMouseLeave={()=>setHovered(null)}>
                  <div className={`transition-transform duration-200 ${hovered===c.id?'-translate-y-3':''}`}>
                    <Card card={c} />
                  </div>
                  <div className="mt-1 text-center">
                    <div className="text-white/50 text-xs">${c.value}M cash value</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "rent":
        return (
          <div>
            <p className="text-white/60 mb-4 text-sm">Play a Rent card to charge all opponents (Wild Rent) or one opponent (color Rent). Use <strong className="text-white">Double Rent</strong> beforehand to charge 2×!</p>
            <div className="flex gap-3 flex-wrap items-start">
              {RENT_CARDS.map(c => (
                <div key={c.id} className="relative group"
                  onMouseEnter={()=>setHovered(c.id)}
                  onMouseLeave={()=>setHovered(null)}>
                  <div className={`transition-transform duration-200 ${hovered===c.id?'-translate-y-3':''}`}>
                    <Card card={c} />
                  </div>
                  <div className="mt-1 text-center text-white/50 text-xs">{c.desc}</div>
                </div>
              ))}
            </div>
            {/* Rent table reference */}
            <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-white font-bold mb-3">📊 Complete Rent Reference</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(COLORS).map(([key, col]) => (
                  <div key={key} className="flex items-center gap-2 bg-black/20 rounded-lg p-2">
                    <div className="rounded w-3 h-3 flex-shrink-0" style={{ background:{ brown:'#7c4a1e',lightblue:'#0e7ab8',pink:'#c0206c',orange:'#c44a00',red:'#b01212',yellow:'#b08800',green:'#0a7a28',blue:'#0a38c0',railroad:'#3a3a4a',utility:'#0a6a68' }[key] }} />
                    <span className="text-white/80 text-xs w-20 flex-shrink-0">{col.label}</span>
                    <div className="flex gap-1">
                      {col.rents.slice(1).map((r,i) => (
                        <span key={i} className={`text-xs px-1 rounded font-bold ${i===col.rents.length-2?'bg-yellow-400 text-black':'bg-white/15 text-white/70'}`}>
                          ${r}M
                        </span>
                      ))}
                    </div>
                    <span className="text-white/30 text-xs ml-auto">set of {col.setSize}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background:'linear-gradient(160deg, #0a0614 0%, #06021a 50%, #0a0614 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-white/10" style={{ background:'rgba(10,5,25,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/60 hover:text-white transition-colors text-sm">← Back</Link>
            <h1 className="text-white font-black text-lg">🃏 Card Gallery</h1>
            <span className="text-white/40 text-sm">110 cards total</span>
          </div>
          <div className="text-white/50 text-xs hidden sm:block">Hover to preview · Click in-game to play</div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-0 flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.key}
              onClick={()=>setTab(t.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-t-lg font-semibold text-sm transition-all
                ${tab===t.key
                  ? 'bg-white/15 text-white border-t border-l border-r border-white/20'
                  : 'text-white/50 hover:text-white/80'
                }`}>
              {t.label}
              <span className={`ml-1.5 text-xs ${tab===t.key?'text-white/50':'text-white/30'}`}>({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {renderSection()}
      </div>
    </div>
  );
}
