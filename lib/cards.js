// ─── Property Colors ─────────────────────────────────────────────────────────
export const COLORS = {
  brown:  { label: "Brown",  setSize: 2, rents: [0, 2, 5],    gradient: "from-amber-700 to-amber-900",   border: "border-amber-600",   ring: "ring-amber-500"   },
  blue:   { label: "Blue",   setSize: 2, rents: [0, 3, 8],    gradient: "from-blue-500 to-blue-700",     border: "border-blue-400",    ring: "ring-blue-400"    },
  red:    { label: "Red",    setSize: 3, rents: [0, 2, 4, 8], gradient: "from-red-500 to-red-700",       border: "border-red-400",     ring: "ring-red-400"     },
  green:  { label: "Green",  setSize: 3, rents: [0, 2, 4, 7], gradient: "from-green-500 to-green-700",   border: "border-green-400",   ring: "ring-green-400"   },
  yellow: { label: "Yellow", setSize: 3, rents: [0, 2, 4, 6], gradient: "from-yellow-400 to-yellow-600", border: "border-yellow-300",  ring: "ring-yellow-300"  },
  orange: { label: "Orange", setSize: 3, rents: [0, 1, 3, 5], gradient: "from-orange-500 to-orange-700", border: "border-orange-400",  ring: "ring-orange-400"  },
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

// ─── Deck Factory ─────────────────────────────────────────────────────────────
export function createDeck() {
  _id = 1; // reset IDs per game
  const cards = [];

  // PROPERTIES ─────────────────────────────────────────────────────────────────
  const properties = [
    // Brown (need 2)
    { color: "brown",  name: "Brownstone Ave", value: 3 },
    { color: "brown",  name: "Brownstone Park", value: 3 },
    // Blue (need 2)
    { color: "blue",   name: "Blue Harbor", value: 4 },
    { color: "blue",   name: "Blue Bay Blvd", value: 4 },
    // Red (need 3)
    { color: "red",    name: "Red Hill Rd", value: 3 },
    { color: "red",    name: "Red St Station", value: 3 },
    { color: "red",    name: "Red Ridge Way", value: 3 },
    // Green (need 3)
    { color: "green",  name: "Green Park Ave", value: 2 },
    { color: "green",  name: "Green Gate St", value: 2 },
    { color: "green",  name: "Green Glen Dr", value: 2 },
    // Yellow (need 3)
    { color: "yellow", name: "Yellow Yard Blvd", value: 2 },
    { color: "yellow", name: "Yellow Way", value: 2 },
    { color: "yellow", name: "Yellow Walk Ct", value: 2 },
    // Orange (need 3)
    { color: "orange", name: "Orange Ave", value: 1 },
    { color: "orange", name: "Orange Oak Pl", value: 1 },
    { color: "orange", name: "Orange Oval Ct", value: 1 },
  ];
  properties.forEach((p) => cards.push({ id: uid(), type: "property", ...p }));

  // MONEY ───────────────────────────────────────────────────────────────────────
  [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 10, 10].forEach((v) =>
    cards.push({ id: uid(), type: "money", name: `$${v}M`, value: v, color: null })
  );

  // ACTION ──────────────────────────────────────────────────────────────────────
  const actions = [
    { count: 4, name: "Pass Go",         action: "passgo",        desc: "Draw 2 extra cards",                          value: 1 },
    { count: 3, name: "Debt Collector",  action: "debtcollector", desc: "Collect $5M from opponent",                   value: 3 },
    { count: 3, name: "It's My B-Day!",  action: "birthday",      desc: "Collect $2M from opponent",                   value: 2 },
    { count: 3, name: "Sly Deal",        action: "slydeal",       desc: "Steal 1 property from an incomplete set",      value: 3 },
    { count: 2, name: "Deal Breaker",    action: "dealbreaker",   desc: "Steal a complete property set",               value: 5 },
    { count: 2, name: "Double Rent",     action: "doublerent",    desc: "Next rent card you play is doubled",           value: 1 },
    { count: 3, name: "Just Say No",     action: "justsayno",     desc: "Cancel any action played against you ($4M)",   value: 4 },
    // ── Weird Cards ─────────────────────────────────────────────────────────
    { count: 2, name: "Identity Swap",   action: "identityswap",  desc: "Swap ALL assets with your opponent instantly!", value: 4 },
    { count: 2, name: "Tax The Rich",    action: "taxtherich",    desc: "Steal half of opponent's bank (rounded down)", value: 3 },
    { count: 2, name: "Time Warp",       action: "timewarp",      desc: "Take an extra play this turn (+1 play)",        value: 2 },
    { count: 2, name: "Chaos Card",      action: "chaoscard",     desc: "Randomly shuffle BOTH hands back into deck, then redraw 5 each!", value: 2 },
  ];
  actions.forEach(({ count, name, action, desc, value }) => {
    for (let i = 0; i < count; i++) {
      cards.push({ id: uid(), type: "action", name, action, desc, value, color: null });
    }
  });

  // RENT ────────────────────────────────────────────────────────────────────────
  const rentCards = [
    { colors: ["brown", "blue"],   name: "Rent",      value: 1 },
    { colors: ["brown", "blue"],   name: "Rent",      value: 1 },
    { colors: ["red", "yellow"],   name: "Rent",      value: 1 },
    { colors: ["red", "yellow"],   name: "Rent",      value: 1 },
    { colors: ["green", "orange"], name: "Rent",      value: 1 },
    { colors: ["green", "orange"], name: "Rent",      value: 1 },
    { colors: null,                name: "Wild Rent", value: 3 },
    { colors: null,                name: "Wild Rent", value: 3 },
  ];
  rentCards.forEach(({ colors, name, value }) => {
    const desc = colors
      ? `Charge rent for ${colors.map((c) => COLORS[c].label).join(" or ")}`
      : "Charge rent for ANY color";
    cards.push({ id: uid(), type: "rent", name, action: "rent", colors, desc, value, color: null });
  });

  return shuffle(cards);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
