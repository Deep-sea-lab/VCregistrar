import { NextRequest, NextResponse } from "next/server";

/**
 * Validates CSRF protection by checking Origin and Referer headers
 * @param request The Next.js request object
 * @returns true if CSRF validation passes, false otherwise
 */
export function validateCSRF(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const allowedOrigin = process.env.NEXTAUTH_URL;

  if (!allowedOrigin) {
    console.warn("NEXTAUTH_URL not configured for CSRF validation");
    return false;
  }

  // Check Origin header (for same-site POST requests)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowedOrigin);
      if (originUrl.hostname !== allowedUrl.hostname) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // Check Referer header as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const allowedUrl = new URL(allowedOrigin);
      if (refererUrl.hostname !== allowedUrl.hostname) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // For requests without Origin/Referer, assume same-site (browser security)
  return true;
}

/**
 * Returns a CSRF validation error response
 */
export function csrfErrorResponse() {
  return NextResponse.json(
    { error: "CSRF validation failed" },
    { status: 403 }
  );
}
