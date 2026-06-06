import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { validateCSRF, csrfErrorResponse } from "@/lib/csrf";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logAudit, getClientIpFromRequest, getUserAgentFromRequest } from "@/lib/audit-log";

const MAX_BODY_SIZE = 1024 * 5; // 5KB limit

export async function POST(req: NextRequest) {
  const ipAddress = getClientIpFromRequest(req);
  const userAgent = getUserAgentFromRequest(req);

  try {
    // CSRF validation
    if (!validateCSRF(req)) {
      await logAudit({
        action: "LOGIN_ATTEMPT",
        ipAddress: ipAddress,
        status: "failure",
        details: "CSRF validation failed",
        userAgent,
      });
      return csrfErrorResponse();
    }

    // Request body size limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    // Rate limiting for login attempts
    const ip = getClientIp(req);
    const rateLimitResult = await rateLimit(ip);

    if (!rateLimitResult.success) {
      await logAudit({
        action: "LOGIN_ATTEMPT",
        ipAddress: ipAddress,
        status: "failure",
        details: "Rate limit exceeded",
        userAgent,
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.reset),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      await logAudit({
        action: "LOGIN_ATTEMPT",
        ipAddress: ipAddress,
        status: "failure",
        details: "Missing email or password",
        userAgent,
      });
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Log login attempt
    await logAudit({
      action: "LOGIN_ATTEMPT",
      email,
      ipAddress: ipAddress,
      status: "pending",
      userAgent,
    });

    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      // Log login success
      await logAudit({
        action: "LOGIN_SUCCESS",
        email,
        ipAddress: ipAddress,
        status: "success",
        userAgent,
      });

      return NextResponse.json(
        { message: "Login successful" },
        { status: 200 }
      );
    } catch (error) {
      // Log login failure
      await logAudit({
        action: "LOGIN_FAILED",
        email,
        ipAddress: ipAddress,
        status: "failure",
        details: "Invalid email or password",
        userAgent,
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Login error:", sanitizeErrorLog(error));
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

function sanitizeErrorLog(error: any): string {
  const errorStr = JSON.stringify(error);
  return errorStr
    .replace(/password["\']?\s*:\s*["\'][^"\']*["\']/gi, "password: ***")
    .replace(/token["\']?\s*:\s*["\'][^"\']*["\']/gi, "token: ***")
    .replace(/secret["\']?\s*:\s*["\'][^"\']*["\']/gi, "secret: ***");
}
