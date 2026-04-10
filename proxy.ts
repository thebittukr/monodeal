import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware — check session cookie for protected routes
export default function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");
  const path = request.nextUrl.pathname;

  // Protected routes
  const protectedPaths = ["/credits", "/wallet", "/profile", "/settings"];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/credits/:path*", "/wallet/:path*", "/profile/:path*", "/settings/:path*"],
};
