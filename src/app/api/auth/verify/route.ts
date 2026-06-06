import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - this endpoint must be protected
    const ip = getClientIp(req);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET!,
      salt: "jwt",
    });

    if (!decoded) {
      return NextResponse.json(
        { error: "Token is invalid or expired" },
        { status: 401 }
      );
    }

    // Return limited information only - don't expose all token data
    return NextResponse.json(
      {
        valid: true,
        exp: decoded.exp,
        iat: decoded.iat,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
