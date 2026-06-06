import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateCSRF, csrfErrorResponse } from "@/lib/csrf";
import { logAudit, getClientIpFromRequest, getUserAgentFromRequest } from "@/lib/audit-log";
import { verifyHCaptcha, isHCaptchaEnabled } from "@/lib/hcaptcha";

const BCRYPT_ROUNDS = 14;
const MAX_BODY_SIZE = 1024 * 10; // 10KB limit

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIpFromRequest(req);
  const userAgent = getUserAgentFromRequest(req);

  try {
    // CSRF validation
    if (!validateCSRF(req)) {
      await logAudit({
        action: "REGISTRATION_ATTEMPT",
        ipAddress,
        status: "failure",
        details: "CSRF validation failed",
        userAgent,
      });
      return csrfErrorResponse();
    }

    // Request body size limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      await logAudit({
        action: "REGISTRATION_ATTEMPT",
        ipAddress,
        status: "failure",
        details: "Request body too large",
        userAgent,
      });
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "";

    let name: string | undefined;
    let email: string;
    let password: string;
    let hcaptchaToken: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      name = body.name;
      email = body.email;
      password = body.password;
      hcaptchaToken = body.hcaptchaToken;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      name = params.get("name") || undefined;
      email = params.get("email") || "";
      password = params.get("password") || "";
      hcaptchaToken = params.get("hcaptchaToken") || undefined;
    }

    if (!email || !password) {
      await logAudit({
        action: "REGISTRATION_ATTEMPT",
        email,
        ipAddress,
        status: "failure",
        details: "Missing email or password",
        userAgent,
      });
      const url = new URL("/register", req.url);
      url.searchParams.set("error", "MISSING_FIELDS");
      if (isValidRedirectUrl(callbackUrl)) {
        url.searchParams.set("callbackUrl", callbackUrl);
      }
      return NextResponse.redirect(url);
    }

    // Validate email format
    if (!isValidEmail(email)) {
      await logAudit({
        action: "REGISTRATION_ATTEMPT",
        email,
        ipAddress,
        status: "failure",
        details: "Invalid email format",
        userAgent,
      });
      const url = new URL("/register", req.url);
      url.searchParams.set("error", "INVALID_EMAIL");
      if (isValidRedirectUrl(callbackUrl)) {
        url.searchParams.set("callbackUrl", callbackUrl);
      }
      return NextResponse.redirect(url);
    }

    if (password.length < 12) {
      await logAudit({
        action: "REGISTRATION_ATTEMPT",
        email,
        ipAddress,
        status: "failure",
        details: "Password too weak (length)",
        userAgent,
      });
      const url = new URL("/register", req.url);
      url.searchParams.set("error", "WEAK_PASSWORD");
      if (isValidRedirectUrl(callbackUrl)) {
        url.searchParams.set("callbackUrl", callbackUrl);
      }
      return NextResponse.redirect(url);
    }

    // hCaptcha 校验(若 HCAPTCHA_SECRET 已配置)
    if (isHCaptchaEnabled()) {
      const captchaResult = await verifyHCaptcha(hcaptchaToken, {
        remoteIp: ipAddress,
      });
      if (!captchaResult.success) {
        await logAudit({
          action: "REGISTRATION_ATTEMPT",
          email,
          ipAddress,
          status: "failure",
          details: `hCaptcha verification failed: ${
            captchaResult["error-codes"]?.join(",") || "unknown"
          }`,
          userAgent,
        });
        const url = new URL("/register", req.url);
        url.searchParams.set("error", "HCAPTCHA_FAILED");
        if (isValidRedirectUrl(callbackUrl)) {
          url.searchParams.set("callbackUrl", callbackUrl);
        }
        return NextResponse.redirect(url);
      }
    }

    // Validate password complexity
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      await logAudit({
        action: "REGISTRATION_ATTEMPT",
        email,
        ipAddress,
        status: "failure",
        details: "Password weak (complexity)",
        userAgent,
      });
      const url = new URL("/register", req.url);
      url.searchParams.set("error", "PASSWORD_WEAK");
      if (isValidRedirectUrl(callbackUrl)) {
        url.searchParams.set("callbackUrl", callbackUrl);
      }
      return NextResponse.redirect(url);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      await logAudit({
        action: "REGISTRATION_ATTEMPT",
        email,
        ipAddress,
        status: "failure",
        details: "Email already exists",
        userAgent,
      });
      const url = new URL("/register", req.url);
      url.searchParams.set("error", "EMAIL_EXISTS");
      if (isValidRedirectUrl(callbackUrl)) {
        url.searchParams.set("callbackUrl", callbackUrl);
      }
      return NextResponse.redirect(url);
    }

    const passwordHash = await hash(password, BCRYPT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        name: name || email.split("@")[0],
        email,
        passwordHash,
      },
    });

    await logAudit({
      action: "REGISTRATION_SUCCESS",
      userId: newUser.id,
      email,
      ipAddress,
      status: "success",
      details: "User registered successfully",
      userAgent,
    });

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "success",
      "Account created successfully. Please sign in."
    );
    if (isValidRedirectUrl(callbackUrl)) {
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
    }
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("Registration error:", sanitizeErrorLog(error));
    await logAudit({
      action: "REGISTRATION_FAILED",
      ipAddress,
      status: "failure",
      details: "Internal server error",
      userAgent,
    });
    const url = new URL("/register", req.url);
    url.searchParams.set("error", "default");
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "";
    if (isValidRedirectUrl(callbackUrl)) {
      url.searchParams.set("callbackUrl", callbackUrl);
    }
    return NextResponse.redirect(url);
  }
}

function isValidRedirectUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, process.env.NEXTAUTH_URL);
    const allowed = new URL(process.env.NEXTAUTH_URL!);
    return parsed.hostname === allowed.hostname;
  } catch {
    return false;
  }
}

function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Must contain uppercase letters" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Must contain lowercase letters" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Must contain numbers" };
  }
  return { valid: true };
}

function sanitizeErrorLog(error: any): string {
  const errorStr = JSON.stringify(error);
  return errorStr
    .replace(/password["\']?\s*:\s*["\'][^"\']*["\']/gi, "password: ***")
    .replace(/token["\']?\s*:\s*["\'][^"\']*["\']/gi, "token: ***")
    .replace(/secret["\']?\s*:\s*["\'][^"\']*["\']/gi, "secret: ***");
}


