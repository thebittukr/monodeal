import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  // Detect base URL from forwarded headers (Railway/Vercel proxy) or fallback
  const headers = new Headers(req.headers);
  const forwardedHost = headers.get("x-forwarded-host") || headers.get("host");
  const forwardedProto = headers.get("x-forwarded-proto") || "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${forwardedProto}://${forwardedHost}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
