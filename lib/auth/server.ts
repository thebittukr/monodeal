/**
 * Custom auth — no Neon Auth dependency.
 * Simple cookie-based sessions with bcrypt password hashing.
 */

// Placeholder — auth is now handled via custom API routes
// No middleware needed since we use cookie-based sessions

export const auth = {
  middleware: () => (req: any) => req,
  handler: () => ({ GET: async () => new Response("OK"), POST: async () => new Response("OK") }),
  getSession: async () => null,
};
