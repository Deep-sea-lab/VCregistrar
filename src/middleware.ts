import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// ✅ 关键: middleware 中调用 NextAuth(authConfig),而不是 import { auth } from "@/auth"
// 这样 Edge bundle 中不会包含 prisma / bcryptjs / @auth/prisma-adapter 等 Node.js 专属模块
const { auth } = NextAuth(authConfig);

// Routes that require rate limiting
const RATE_LIMITED_ROUTES = ["/api/auth/callback", "/api/auth/verify"];

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate Limiting ---
  if (RATE_LIMITED_ROUTES.some((route) => pathname.startsWith(route))) {
    const ip = getClientIp(request);
    const result = await rateLimit(ip);

    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.reset),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
          },
        }
      );
    }
  }

  // --- Auth Protection ---
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const session = await auth();
    if (!session?.user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to protected routes and rate-limited API routes
    "/dashboard/:path*",
    "/api/auth/callback/:path*",
    "/api/auth/verify",
  ],
};
