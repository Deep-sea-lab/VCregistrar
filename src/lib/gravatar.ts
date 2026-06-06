import crypto from "crypto";

/**
 * Generate Gravatar URL for an email address
 * @param email - The email address to generate Gravatar for
 * @param size - The size of the avatar (default: 200)
 * @param defaultImage - The default image to use if no Gravatar found
 * @returns Gravatar URL
 */
export function getGravatarUrl(
  email: string | null | undefined,
  size: number = 200,
  defaultImage: string = "identicon"
): string {
  if (!email) {
    // Return placeholder if no email
    return `https://www.gravatar.com/avatar?s=${size}&d=${defaultImage}`;
  }

  // Gravatar requires lowercase, trimmed email
  const cleanEmail = email.toLowerCase().trim();

  // Use SHA256 instead of MD5 for better security
  const hash = crypto.createHash("sha256").update(cleanEmail).digest("hex");

  // Build Gravatar URL with parameters
  const url = new URL(`https://www.gravatar.com/avatar/${hash}`);
  url.searchParams.set("s", size.toString());
  url.searchParams.set("d", defaultImage);

  return url.toString();
}

/**
 * Get alt text for Gravatar
 */
export function getGravatarAlt(name?: string | null, email?: string | null): string {
  if (name) return `${name}'s avatar`;
  if (email) return `Avatar for user`;
  return "User avatar";
}

