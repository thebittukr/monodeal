import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (token) {
      await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }
}
