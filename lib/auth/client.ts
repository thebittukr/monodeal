"use client";

// Custom auth client — no Neon Auth
export const authClient = {
  signIn: {
    email: async (opts: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      return res.json();
    },
    social: async (_opts: { provider: string }) => {
      // Google OAuth not available without Neon Auth
      throw new Error("Google sign-in is not configured");
    },
  },
  signUp: {
    email: async (opts: { name: string; email: string; password: string }) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      return res.json();
    },
  },
};
