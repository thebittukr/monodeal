/**
 * Tailwind v4 safelist — this file exists so Tailwind's content scanner
 * finds these dynamically-composed classes. Never imported at runtime.
 *
 * Card.jsx and AssetDisplay.jsx compose gradient classes from objects,
 * which Tailwind's JIT scanner might miss.
 */

export const SAFELIST = [
  // Card action gradients
  "from-sky-600", "to-blue-800",
  "from-amber-600", "to-orange-800",
  "from-pink-500", "to-rose-700",
  "from-orange-500", "to-red-700",
  "from-red-600", "to-rose-900",
  "from-green-600", "to-teal-800",
  "from-slate-500", "to-gray-800",
  "from-violet-600", "to-purple-900",
  "from-amber-700", "to-yellow-900",
  "from-cyan-600", "to-indigo-800",
  "from-fuchsia-600", "to-purple-800",
  "from-rose-600", "to-red-800",
  "from-orange-700", "to-red-900",
  "from-teal-600", "to-cyan-800",
  "from-emerald-600", "to-green-800",
  "from-sky-600", "to-indigo-800",
  "bg-gradient-to-br",

  // Property card set colors
  "from-red-500", "to-red-700", "border-red-400",
  "from-blue-500", "to-blue-700", "border-blue-400",
  "from-green-500", "to-green-700", "border-green-400",
  "from-yellow-400", "to-yellow-600", "border-yellow-300",
  "from-purple-500", "to-purple-700", "border-purple-400",
  "from-orange-500", "to-orange-700", "border-orange-400",
  "from-amber-700", "to-amber-900", "border-amber-600",

  // Rings
  "ring-red-400", "ring-blue-400", "ring-green-400",
  "ring-yellow-300", "ring-purple-400", "ring-orange-400", "ring-amber-500",
];
