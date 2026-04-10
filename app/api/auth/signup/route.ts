import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: "Name, email, and password required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    // Check if email exists
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [user] = await db.insert(schema.users).values({
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
    }).returning();

    // Create session
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(schema.sessions).values({ userId: user.id, token, expiresAt });

    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set("session", token, { httpOnly: true, path: "/", expires: expiresAt, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
