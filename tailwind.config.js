/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Ensure dynamic color classes aren't purged
    "from-red-500", "to-red-700", "border-red-400",
    "from-blue-500", "to-blue-700", "border-blue-400",
    "from-green-500", "to-green-700", "border-green-400",
    "from-yellow-400", "to-yellow-600", "border-yellow-300",
    "from-purple-500", "to-purple-700", "border-purple-400",
    "from-orange-500", "to-orange-700", "border-orange-400",
    "from-amber-700", "to-amber-900", "border-amber-600",
    "ring-red-400", "ring-blue-400", "ring-green-400",
    "ring-yellow-300", "ring-purple-400", "ring-orange-400", "ring-amber-500",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["system-ui", "sans-serif"],
      },
      animation: {
        "card-deal": "cardDeal 0.3s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "bounce-sm": "bounceSm 0.4s ease-in-out",
      },
      keyframes: {
        cardDeal: {
          "0%": { transform: "translateY(-20px) scale(0.9)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        bounceSm: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
