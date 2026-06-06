import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "REGISTRATION_ATTEMPT"
  | "REGISTRATION_SUCCESS"
  | "REGISTRATION_FAILED"
  | "LOGIN_ATTEMPT"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "EMAIL_VERIFICATION_REQUESTED"
  | "EMAIL_VERIFICATION_SUCCESS"
  | "EMAIL_VERIFICATION_FAILED"
  | "OAUTH_LOGIN_ATTEMPT"
  | "OAUTH_LOGIN_SUCCESS"
  | "OAUTH_LOGIN_FAILED";

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  email?: string;
  ipAddress: string;
  status: "success" | "failure" | "pending";
  details?: string;
  userAgent?: string;
}

/**
 * Log an audit entry
 * Note: In production, consider using a dedicated logging service
 * This implementation logs to console for demonstration
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString();

  // Format log message
  const logMessage = [
    `[AUDIT] ${timestamp}`,
    `Action: ${entry.action}`,
    `Status: ${entry.status}`,
    entry.userId && `UserId: ${entry.userId}`,
    entry.email && `Email: ${sanitizeEmail(entry.email)}`,
    `IP: ${entry.ipAddress}`,
    entry.details && `Details: ${entry.details}`,
  ]
    .filter(Boolean)
    .join(" | ");

  // Log based on status
  if (entry.status === "failure") {
    console.warn(logMessage);
  } else if (entry.action.includes("ATTEMPT")) {
    console.debug(logMessage);
  } else {
    console.log(logMessage);
  }

  // In production, send to external logging service
  // Example: await sendToDatadog(entry);
  // Example: await sendToCloudWatch(entry);
}

/**
 * Sanitize email for logging (prevent logging full email)
 */
function sanitizeEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart.substring(0, 2)}***@${domain}`;
}

/**
 * Get client IP from request headers
 */
export function getClientIpFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "127.0.0.1";
}

/**
 * Get user agent from request
 */
export function getUserAgentFromRequest(request: Request): string | undefined {
  return request.headers.get("user-agent") || undefined;
}
