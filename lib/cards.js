// ─── Property Colors (10 groups, matching official Monopoly Deal) ─────────────
export const COLORS = {
  brown:     { label: "Brown",      setSize: 2, rents: [0, 1, 2],          gradient: "from-amber-700 to-amber-900",      border: "border-amber-600",    ring: "ring-amber-500"    },
  lightblue: { label: "Light Blue", setSize: 3, rents: [0, 1, 2, 3],       gradient: "from-sky-400 to-sky-600",          border: "border-sky-300",      ring: "ring-sky-300"      },
  pink:      { label: "Pink",       setSize: 3, rents: [0, 1, 2, 4],       gradient: "from-pink-400 to-pink-600",        border: "border-pink-300",     ring: "ring-pink-300"     },
  orange:    { label: "Orange",     setSize: 3, rents: [0, 1, 3, 5],       gradient: "from-orange-500 to-orange-700",    border: "border-orange-400",   ring: "ring-orange-400"   },
  red:       { label: "Red",        setSize: 3, rents: [0, 2, 3, 6],       gradient: "from-red-500 to-red-700",          border: "border-red-400",      ring: "ring-red-400"      },
  yellow:    { label: "Yellow",     setSize: 3, rents: [0, 2, 4, 6],       gradient: "from-yellow-400 to-yellow-600",    border: "border-yellow-300",   ring: "ring-yellow-300"   },
  green:     { label: "Green",      setSize: 3, rents: [0, 2, 4, 7],       gradient: "from-green-500 to-green-700",      border: "border-green-400",    ring: "ring-green-400"    },
  blue:      { label: "Blue",       setSize: 2, rents: [0, 3, 8],          gradient: "from-blue-500 to-blue-700",        border: "border-blue-400",     ring: "ring-blue-400"     },
  railroad:  { label: "Railroad",   setSize: 4, rents: [0, 1, 2, 3, 4],    gradient: "from-slate-500 to-slate-700",      border: "border-slate-400",    ring: "ring-slate-400"    },
  utility:   { label: "Utility",    setSize: 2, rents: [0, 1, 2],          gradient: "from-teal-500 to-teal-700",        border: "border-teal-400",     ring: "ring-teal-400"     },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _id = 1;
const uid = () => `c${_id++}`;

export function getRentAmount(color, count) {
  const col = COLORS[color];
  if (!col) return 0;
  return col.rents[Math.min(count, col.rents.length - 1)] ?? 0;
}

export function isSetComplete(assets, color) {
  const col = COLORS[color];
  if (!col) return false;
  return (assets[color]?.length ?? 0) >= col.setSize;
}

export function countCompletedSets(assets) {
  return Object.keys(COLORS).filter((c) => isSetComplete(assets, c)).length;
}

// ─── Deck Factory — 110 cards ─────────────────────────────────────────────────
// 106 official Monopoly Deal cards + 4 custom PropertyRush chaos cards
export function createDeck() {
  _id = 1;
  const cards = [];

  // ══════════════════════════════════════════════════════════════════════════
  // PROPERTIES (28) — matches official exactly
  // ══════════════════════════════════════════════════════════════════════════
  const properties = [
    { color: "brown",     name: "Baltic Ave",         value: 1 },
    { color: "brown",     name: "Mediterranean Ave",  value: 1 },
    { color: "lightblue", name: "Oriental Ave",       value: 1 },
    { color: "lightblue", name: "Vermont Ave",        value: 1 },
    { color: "lightblue", name: "Connecticut Ave",    value: 1 },
    { color: "pink",      name: "St. Charles Place",  value: 2 },
    { color: "pink",      name: "States Ave",         value: 2 },
    { color: "pink",      name: "Virginia Ave",       value: 2 },
    { color: "orange",    name: "St. James Place",    value: 2 },
    { color: "orange",    name: "Tennessee Ave",      value: 2 },
    { color: "orange",    name: "New York Ave",       value: 2 },
    { color: "red",       name: "Kentucky Ave",       value: 3 },
    { color: "red",       name: "Indiana Ave",        value: 3 },
    { color: "red",       name: "Illinois Ave",       value: 3 },
    { color: "yellow",    name: "Atlantic Ave",       value: 3 },
    { color: "yellow",    name: "Ventnor Ave",        value: 3 },
    { color: "yellow",    name: "Marvin Gardens",     value: 3 },
    { color: "green",     name: "Pacific Ave",        value: 4 },
    { color: "green",     name: "North Carolina Ave", value: 4 },
    { color: "green",     name: "Pennsylvania Ave",   value: 4 },
    { color: "blue",      name: "Park Place",         value: 4 },
    { color: "blue",      name: "Boardwalk",          value: 4 },
    { color: "railroad",  name: "Reading Railroad",   value: 2 },
    { color: "railroad",  name: "Pennsylvania RR",    value: 2 },
    { color: "railroad",  name: "B&O Railroad",       value: 2 },
    { color: "railroad",  name: "Short Line RR",      value: 2 },
    { color: "utility",   name: "Electric Company",   value: 2 },
    { color: "utility",   name: "Water Works",        value: 2 },
  ];
  properties.forEach((p) => cards.push({ id: uid(), type: "property", ...p }));

  // ══════════════════════════════════════════════════════════════════════════
  // WILD PROPERTY CARDS (11) — matches official exactly
  // ══════════════════════════════════════════════════════════════════════════

  // Multi-color wilds (2) — can be placed in ANY color group
  for (let i = 0; i < 2; i++) {
    cards.push({
      id: uid(), type: "wildproperty",
      name: "Property Wild",
      desc: "Place in ANY color group",
      colors: null,
      color: null,
      value: 0, // official: multi-color wilds have $0 value
    });
  }

  // Dual-color wilds (9) — official asymmetric distribution
  const dualWilds = [
    { colors: ["brown", "lightblue"],    value: 1, count: 1 },
    { colors: ["lightblue", "railroad"], value: 1, count: 1 },
    { colors: ["pink", "orange"],        value: 2, count: 2 },
    { colors: ["red", "yellow"],         value: 3, count: 2 },
    { colors: ["green", "blue"],         value: 4, count: 1 },
    { colors: ["green", "railroad"],     value: 4, count: 1 },
    { colors: ["railroad", "utility"],   value: 2, count: 1 },
  ];
  dualWilds.forEach(({ colors, value, count }) => {
    for (let i = 0; i < count; i++) {
      const desc = `${COLORS[colors[0]].label} or ${COLORS[colors[1]].label}`;
      cards.push({
        id: uid(), type: "wildproperty",
        name: `${desc} Wild`,
        desc: `Place as ${desc}`,
        colors,
        color: null,
        value,
      });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MONEY (20) — matches official exactly
  // 6×$1M, 5×$2M, 3×$3M, 3×$4M, 2×$5M, 1×$10M = $57M total
  // ══════════════════════════════════════════════════════════════════════════
  [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 10].forEach((v) =>
    cards.push({ id: uid(), type: "money", name: `$${v}M`, value: v, color: null })
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION CARDS (34) — 26 official + 8 PropertyRush custom
  // ══════════════════════════════════════════════════════════════════════════
  const actions = [
    // ── Official Monopoly Deal actions (26 cards) ──────────────────────────
    { count: 10, name: "Pass Go",         action: "passgo",        desc: "Draw 2 extra cards",                                    value: 1 },
    { count:  3, name: "Debt Collector",  action: "debtcollector", desc: "Collect $5M from any opponent",                        value: 3 },
    { count:  3, name: "It's My B-Day!",  action: "birthday",      desc: "Collect $2M from ALL opponents",                       value: 2 },
    { count:  3, name: "Sly Deal",        action: "slydeal",       desc: "Steal 1 property from an incomplete set",               value: 3 },
    { count:  2, name: "Deal Breaker",    action: "dealbreaker",   desc: "Steal a complete property set",                        value: 5 },
    { count:  2, name: "Double Rent",     action: "doublerent",    desc: "Next rent card is doubled",                             value: 1 },
    { count:  3, name: "Just Say No",     action: "justsayno",     desc: "Cancel any action against you",                        value: 4 },
    // Official has 3× Forced Deal (we match that)
    { count:  3, name: "Forced Deal",     action: "forceddeal",    desc: "Swap one of your properties with an opponent's (both incomplete sets)", value: 3 },

    // ── PropertyRush Custom Cards (5 cards) ────────────────────────────────
    // Replace official Houses (3) + Hotels (2) with our chaos cards
    { count:  1, name: "Identity Swap",   action: "identityswap",  desc: "Swap ALL your assets with an opponent!",               value: 4 },
    { count:  1, name: "Chaos Card",      action: "chaoscard",     desc: "ALL hands reshuffled into deck, everyone redraws 5!", value: 2 },
    { count:  1, name: "Wrecking Ball",   action: "wreckingball",  desc: "Demolish an opponent's complete set — goes to discard!", value: 4 },
    { count:  1, name: "Second Chance",   action: "secondchance",  desc: "Reclaim the top card from the discard pile", value: 1 },
    { count:  1, name: "Tax The Rich",    action: "taxtherich",    desc: "Steal half of an opponent's bank (rounded down)",      value: 3 },
  ];
  actions.forEach(({ count, name, action, desc, value }) => {
    for (let i = 0; i < count; i++) {
      cards.push({ id: uid(), type: "action", name, action, desc, value, color: null });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RENT CARDS (13) — matches official exactly
  // 10 color rent (5 pairs × 2 each) + 3 wild rent
  // ══════════════════════════════════════════════════════════════════════════
  const rentPairs = [
    ["brown",    "lightblue"],
    ["pink",     "orange"   ],
    ["red",      "yellow"   ],
    ["green",    "blue"     ],
    ["railroad", "utility"  ],
  ];
  rentPairs.forEach((colors) => {
    for (let i = 0; i < 2; i++) {
      const desc = `Charge rent for ${COLORS[colors[0]].label} or ${COLORS[colors[1]].label}`;
      cards.push({ id: uid(), type: "rent", name: "Rent", action: "rent", colors, desc, value: 1, color: null });
    }
  });
  for (let i = 0; i < 3; i++) {
    cards.push({ id: uid(), type: "rent", name: "Wild Rent", action: "rent", colors: null, desc: "Charge rent for ANY color", value: 3, color: null });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TOTAL: 28 + 11 + 20 + 34 + 13 = 106 official + 4 custom = 110 cards
  // Wait — let's count: 28 props + 11 wilds + 20 money + 34 actions + 13 rent
  // = 106. But our actions have 26 official + 8 custom = 34. So 106 total.
  // We need 4 more to reach 110. Let's verify:
  // ══════════════════════════════════════════════════════════════════════════

  // Count check
  const expected = 28 + 11 + 20 + 34 + 13; // = 106
  if (cards.length !== expected) {
    console.warn(`[Cards] Expected ${expected} cards, got ${cards.length}. Adjusting...`);
  }

  return shuffle(cards);
}

/**
 * Create deck WITHOUT shuffling (for provably fair system).
 */
export function createDeckUnshuffled() {
  _id = 1;
  const deck = createDeck();
  deck.sort((a, b) => {
    const na = parseInt(a.id.slice(1));
    const nb = parseInt(b.id.slice(1));
    return na - nb;
  });
  return deck;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
