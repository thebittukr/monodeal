/**
 * Friends API — add, accept, list friends. Invite to games.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, or, and, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    // Get accepted friends
    const friends = await db
      .select({
        friendshipId: schema.friendships.id,
        friendId: sql<string>`CASE
          WHEN ${schema.friendships.userId} = ${user.id} THEN ${schema.friendships.friendId}
          ELSE ${schema.friendships.userId}
        END`,
        status: schema.friendships.status,
        since: schema.friendships.createdAt,
      })
      .from(schema.friendships)
      .where(
        and(
          or(
            eq(schema.friendships.userId, user.id),
            eq(schema.friendships.friendId, user.id)
          ),
          eq(schema.friendships.status, "accepted")
        )
      );

    // Get pending requests (sent to me)
    const pending = await db
      .select()
      .from(schema.friendships)
      .where(
        and(
          eq(schema.friendships.friendId, user.id),
          eq(schema.friendships.status, "pending")
        )
      );

    return NextResponse.json({ friends, pendingRequests: pending });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const { action, friendId, friendshipId } = await req.json();

    if (action === "add") {
      if (!friendId || friendId === user.id) {
        return NextResponse.json({ error: "Invalid friend ID" }, { status: 400 });
      }

      // Check if already friends or pending
      const existing = await db
        .select()
        .from(schema.friendships)
        .where(
          or(
            and(eq(schema.friendships.userId, user.id), eq(schema.friendships.friendId, friendId)),
            and(eq(schema.friendships.userId, friendId), eq(schema.friendships.friendId, user.id))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ error: "Already friends or request pending" }, { status: 400 });
      }

      await db.insert(schema.friendships).values({
        userId: user.id,
        friendId,
        status: "pending",
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "accept") {
      if (!friendshipId) return NextResponse.json({ error: "friendshipId required" }, { status: 400 });

      await db
        .update(schema.friendships)
        .set({ status: "accepted" })
        .where(
          and(
            eq(schema.friendships.id, friendshipId),
            eq(schema.friendships.friendId, user.id) // only recipient can accept
          )
        );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
