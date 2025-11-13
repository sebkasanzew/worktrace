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

/**
 * Parses duration strings like "mm:ss", "h:mm", "h:mm:ss", or plain minutes (e.g., "15") into seconds
 */
export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Support h:mm:ss, h:mm, mm:ss
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => p.trim());
    if (parts.length === 3) {
      const [h, m, s] = parts.map((p) => Number.parseInt(p, 10));
      if ([h, m, s].some((n) => Number.isNaN(n))) return 0;
      return h * 3600 + m * 60 + s;
    }
    if (parts.length === 2) {
      const [a, b] = parts.map((p) => Number.parseInt(p, 10));
      if ([a, b].some((n) => Number.isNaN(n))) return 0;
      // Interpret as h:mm if a >= 10? Prefer h:mm semantics if a < 10 and b < 60
      if (b < 60 && a < 24) {
        return a * 3600 + b * 60; // h:mm
      }
      return a * 60 + b; // mm:ss fallback
    }
  }

  // plain number => minutes
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(n)) return n * 60;
  return 0;
}

/** Formats seconds into h:mm:ss or m:ss */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Formats a Date into JIRA worklog `started` format: YYYY-MM-DDTHH:mm:ss.SSS±ZZZZ
 */
export function formatJiraStarted(date: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  const tz = -date.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const abs = Math.abs(tz);
  const tzh = pad(Math.floor(abs / 60));
  const tzm = pad(abs % 60);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}${sign}${tzh}${tzm}`;
}
