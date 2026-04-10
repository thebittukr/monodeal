/**
 * Custom session management — replaces Neon Auth.
 * Uses HTTP-only cookie with session token stored in DB.
 */

import { db, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  profile?: {
    username: string;
    level: number;
    xp: number;
    avatarId: string | null;
    equippedGirlfriendId: string | null;
  };
}

/**
 * Get current session user from cookie. Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;

    // Find valid session
    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.token, token), gt(schema.sessions.expiresAt, new Date())))
      .limit(1);

    if (!session) return null;

    // Get user
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    if (!user) return null;

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      image: user.image || undefined,
    };

    // Load profile
    try {
      const profiles = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, user.id))
        .limit(1);

      if (profiles.length > 0) {
        sessionUser.profile = {
          username: profiles[0].username,
          level: profiles[0].level,
          xp: profiles[0].xp,
          avatarId: profiles[0].avatarId,
          equippedGirlfriendId: profiles[0].equippedGirlfriendId,
        };
      }
    } catch {}

    return sessionUser;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Authentication required");
  return user;
}

/**
 * Create user profile on first login.
 */
export async function ensureUserProfile(
  userId: string,
  email: string,
  name?: string
): Promise<void> {
  const existing = await db.select().from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId)).limit(1);
  if (existing.length > 0) return;

  const baseUsername = (name || email.split("@")[0])
    .toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
  const username = `${baseUsername}${Math.floor(Math.random() * 999)}`;

  try { await db.insert(schema.userProfiles).values({ userId, username }).onConflictDoNothing(); } catch {}
  try { await db.insert(schema.credits).values({ userId }).onConflictDoNothing(); } catch {}
  try { await db.insert(schema.userRatings).values({ userId }).onConflictDoNothing(); } catch {}
  try { await db.insert(schema.playerRiskProfiles).values({ userId }).onConflictDoNothing(); } catch {}

  // Grant starter dates
  try {
    const starters = await db.select().from(schema.girlfriends).where(eq(schema.girlfriends.isStarter, true));
    if (starters.length > 0) {
      await db.insert(schema.userGirlfriends).values(
        starters.map((gf, i) => ({ userId, girlfriendId: gf.id, equipped: i === 0 }))
      ).onConflictDoNothing();
    }
  } catch {}
}
