"use client";
import { useState, useMemo } from "react";
import Card from "@/components/Card";
import { createDeck, COLORS } from "@/lib/cards";
import Nav from "@/components/Nav";

export default function CardGalleryPage() {
  const [filter, setFilter] = useState("all");

  // Generate one of each unique card from the deck
  const allCards = useMemo(() => {
    const deck = createDeck();
    // Deduplicate by name+type (show one of each kind)
    const seen = new Set();
    const unique = [];
    for (const card of deck) {
      const key = `${card.type}:${card.name}:${card.color || card.action || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Count how many of this card exist in the deck
        const count = deck.filter(c =>
          c.type === card.type && c.name === card.name &&
          (c.color || c.action || "") === (card.color || card.action || "")
        ).length;
        unique.push({ ...card, count });
      }
    }
    return unique;
  }, []);

  const filtered = filter === "all" ? allCards :
    filter === "property" ? allCards.filter(c => c.type === "property") :
    filter === "wild" ? allCards.filter(c => c.type === "wildproperty") :
    filter === "action" ? allCards.filter(c => c.type === "action") :
    filter === "rent" ? allCards.filter(c => c.type === "rent") :
    filter === "money" ? allCards.filter(c => c.type === "money") :
    allCards;

  const totalCards = allCards.reduce((s, c) => s + c.count, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Nav />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-end justify-between mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Card Gallery</h1>
            <p className="text-slate-500 text-sm mt-1">{totalCards} cards in the deck &middot; {allCards.length} unique</p>
          </div>
        </div>

        {/* Deck breakdown */}
        <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
          <span className="text-slate-600">28 Properties</span>
          <span className="text-slate-700">&middot;</span>
          <span className="text-slate-600">11 Wild Properties</span>
          <span className="text-slate-700">&middot;</span>
          <span className="text-slate-600">20 Money</span>
          <span className="text-slate-700">&middot;</span>
          <span className="text-slate-600">34 Actions</span>
          <span className="text-slate-700">&middot;</span>
          <span className="text-slate-600">13 Rent</span>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {[
            { key: "all", label: "All" },
            { key: "property", label: "Properties" },
            { key: "wild", label: "Wilds" },
            { key: "action", label: "Actions" },
            { key: "rent", label: "Rent" },
            { key: "money", label: "Money" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                filter === f.key ? "bg-violet-600 border-violet-500 text-white" : "bg-black/20 border-white/5 text-slate-500 hover:text-white"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filtered.map((card) => (
            <div key={card.id} className="flex flex-col items-center gap-1">
              <Card card={card} />
              <div className="text-center">
                <div className="text-[9px] text-slate-400 font-medium truncate max-w-[80px]">{card.name}</div>
                <div className="text-[8px] text-slate-600">×{card.count} {card.value > 0 && `· $${card.value}M`}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Color Set Reference */}
        <div className="mt-8 bg-slate-900/60 border border-white/5 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-3">Property Set Sizes & Rent</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(COLORS).map(([key, col]) => (
              <div key={key} className={`rounded-lg p-2.5 border ${col.border} bg-black/20`}>
                <div className="text-xs font-bold text-white">{col.label}</div>
                <div className="text-[9px] text-slate-400">Set: {col.setSize} cards</div>
                <div className="text-[9px] text-slate-500">
                  Rent: {col.rents.slice(1).map((r, i) => `${i + 1}→$${r}M`).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-violet-400 hover:text-violet-300 text-sm transition">&larr; Back to game</a>
        </div>
      </div>
    </div>
  );
}
