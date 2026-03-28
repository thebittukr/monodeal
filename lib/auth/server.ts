import { createNeonAuth } from "@neondatabase/auth/next/server";

// Gracefully handle missing env vars during build
const baseUrl = process.env.NEON_AUTH_BASE_URL || "https://placeholder.neonauth.com";
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET || "build-placeholder-secret-must-be-32-chars!!";

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
  },
});
