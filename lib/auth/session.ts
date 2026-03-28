/**
 * Session helpers for API routes and server components.
 * Gets the current authenticated user from the Neon Auth session.
 */

import { auth } from "./server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface SessionUser {
  id: string; // Neon Auth user ID
  email: string;
  name?: string;
  image?: string;
  // Extended profile from our DB
  profile?: {
    username: string;
    level: number;
    xp: number;
    avatarId: string | null;
    equippedGirlfriendId: string | null;
  };
}

/**
 * Get current session user. Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const result = await auth.getSession();
    // Neon Auth returns a union type — check for data property
    const session = result && "data" in result ? (result as { data: { user: { id: string; email?: string; name: string; image?: string } } }).data : null;
    if (!session?.user) return null;

    const user: SessionUser = {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || undefined,
      image: session.user.image || undefined,
    };

    // Load extended profile
    try {
      const profiles = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, session.user.id))
        .limit(1);

      if (profiles.length > 0) {
        user.profile = {
          username: profiles[0].username,
          level: profiles[0].level,
          xp: profiles[0].xp,
          avatarId: profiles[0].avatarId,
          equippedGirlfriendId: profiles[0].equippedGirlfriendId,
        };
      }
    } catch {
      // Profile not created yet — that's fine
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws if not logged in.
 * Use in API routes that need auth.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

/**
 * Create user profile on first login.
 * Called after successful auth to ensure profile exists.
 */
export async function ensureUserProfile(
  userId: string,
  email: string,
  name?: string
): Promise<void> {
  // Check if profile exists
  const existing = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) return; // already exists

  // Generate username from email or name
  const baseUsername = (name || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);
  const username = `${baseUsername}${Math.floor(Math.random() * 999)}`;

  // Create profile + credits + rating (ignore if already exists)
  try {
    await db.insert(schema.userProfiles).values({ userId, username }).onConflictDoNothing();
  } catch { /* ignore */ }

  try {
    await db.insert(schema.credits).values({ userId }).onConflictDoNothing();
  } catch { /* ignore */ }

  try {
    await db.insert(schema.userRatings).values({ userId }).onConflictDoNothing();
  } catch { /* ignore */ }

  // Give starter girlfriends (the 4 free ones)
  const starters = await db
    .select()
    .from(schema.girlfriends)
    .where(eq(schema.girlfriends.isStarter, true));

  if (starters.length > 0) {
    try {
      await db.insert(schema.userGirlfriends).values(
        starters.map((gf, i) => ({
          userId,
          girlfriendId: gf.id,
          equipped: i === 0,
        }))
      ).onConflictDoNothing();
    } catch { /* ignore duplicates */ }
  }

  // Create risk profile for fraud tracking
  try {
    await db.insert(schema.playerRiskProfiles).values({ userId }).onConflictDoNothing();
  } catch { /* ignore */ }
}
