/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to prevent double-polling in dev

  // ── Image optimization ────────────────────────────────────────────────
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      { protocol: "https", hostname: "r2.propertyrush.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google profile pics
    ],
  },

  // ── Cache headers for static assets ───────────────────────────────────
  async headers() {
    return [
      {
        // Long cache for immutable assets (fonts, images, models)
        source: "/models/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/draco/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Static images — 1 week cache
        source: "/(.*)\\.(png|jpg|jpeg|gif|webp|svg|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        // API: leaderboard — cache 2 min, stale-while-revalidate for 10 min
        source: "/api/leaderboard",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=120, stale-while-revalidate=600" },
        ],
      },
      {
        // API: girlfriends shop data — cache 5 min
        source: "/api/girlfriends",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        // Game state + auth — never cache
        source: "/api/game",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/api/state",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/api/playMove",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/profile",
        headers: [
          { key: "Cache-Control", value: "private, no-cache" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
