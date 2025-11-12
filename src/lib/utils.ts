import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Redacts sensitive information from strings
 * Useful for logging URLs, credentials, and API responses
 */
export function redactSensitive(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  const str = String(value);

  // Redact passwords in URLs (e.g., https://user:password@host)
  // checkov:skip=CKV_SECRET_4: This is just an example of redaction logic
  let redacted = str.replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:***@");

  // Redact API tokens (common patterns)
  redacted = redacted.replace(/[A-Za-z0-9]{20,}/g, (match) => {
    // Keep first and last 4 chars for debugging, redact middle
    if (match.length > 12) {
      return `${match.slice(0, 4)}***${match.slice(-4)}`;
    }
    return "***";
  });

  // Redact email addresses partially
  redacted = redacted.replace(
    /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/g,
    (_, user, domain) => {
      const redactedUser = user.length > 2 ? `${user.slice(0, 2)}***` : "***";
      return `${redactedUser}@${domain}`;
    }
  );

  return redacted;
}

/**
 * Safely stringifies values for logging, with optional redaction
 */
export function safeStringify(value: unknown, redact = false): string {
  try {
    const stringified = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return redact ? redactSensitive(stringified) : stringified;
  } catch {
    return String(value);
  }
}
