/**
 * Security middleware for all API routes.
 * Combines validation, rate limiting, CORS, and content-type enforcement.
 */

import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "./rateLimit";
import { enforceContentType, extractClientInfo } from "./validation";

// ── CORS Config ──────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  "https://propertyrush.net",
  "https://www.propertyrush.net",
  "http://localhost:3000",
  "http://localhost:3001",
]);

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Device-Id, X-Fingerprint",
    "Access-Control-Max-Age": "86400",
  };
}

// ── Preflight Handler ────────────────────────────────────────────────────────

export function handlePreflight(request: Request): NextResponse | null {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return null;
}

// ── Main Security Middleware ──────────────────────────────────────────────────

interface SecurityContext {
  ip: string;
  deviceId: string;
  userAgent: string;
}

interface SecurityResult {
  allowed: boolean;
  response?: NextResponse;
  context: SecurityContext;
}

export async function securityCheck(
  request: Request,
  action: string
): Promise<SecurityResult> {
  const { ip, deviceId, userAgent } = extractClientInfo(request);
  const context: SecurityContext = { ip, deviceId, userAgent };

  // 1. Content-Type check for POST/PUT
  if (request.method !== "GET") {
    const ctError = enforceContentType(request);
    if (ctError) {
      return {
        allowed: false,
        context,
        response: NextResponse.json(
          { error: ctError },
          { status: 415, headers: corsHeaders(request) }
        ),
      };
    }
  }

  // 2. Rate limiting (per IP)
  const rlResult = await checkRateLimit(ip, action);
  if (!rlResult.allowed) {
    return {
      allowed: false,
      context,
      response: NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            ...corsHeaders(request),
            ...rateLimitHeaders(rlResult),
            "Retry-After": String(Math.ceil(rlResult.resetMs / 1000)),
          },
        }
      ),
    };
  }

  return { allowed: true, context };
}

// ── Error Response Helper ────────────────────────────────────────────────────

export function errorResponse(
  request: Request,
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: corsHeaders(request) }
  );
}

export function successResponse(
  request: Request,
  data: unknown,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(request),
  });
}
