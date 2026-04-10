import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Google OAuth callback — exchanges code for tokens, creates/finds user, sets session
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(new URL("/login?error=google_denied", req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/login?error=google_token_failed", req.url));
    }

    // Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL("/login?error=google_no_email", req.url));
    }

    // Find or create user
    let [user] = await db.select().from(schema.users)
      .where(eq(schema.users.email, googleUser.email.toLowerCase())).limit(1);

    if (!user) {
      // Create new user (random password since they use Google)
      const randomPassword = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      [user] = await db.insert(schema.users).values({
        email: googleUser.email.toLowerCase(),
        passwordHash: randomPassword,
        name: googleUser.name || googleUser.email.split("@")[0],
        image: googleUser.picture || null,
      }).returning();
    }

    // Create session
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(schema.sessions).values({ userId: user.id, token, expiresAt });

    // Redirect to home with session cookie
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      expires: expiresAt,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
}
