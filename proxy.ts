import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  matcher: [
    // Protect these routes — require auth
    "/credits/:path*",
    "/profile/:path*",
    "/settings/:path*",
    // Partners + Leaderboard are PUBLIC (shop/browse view)
    // Game API routes that need auth (credits mode)
    // Note: /room and /api/createRoom etc stay public for free play
  ],
};
