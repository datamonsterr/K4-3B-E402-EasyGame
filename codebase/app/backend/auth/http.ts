import "server-only";
import { timingSafeEqual } from "node:crypto";
export const PRODUCTION_APP_URL = "https://ai20k-easy-game.vercel.app";

/**
 * Resolves the base URL for authentication callbacks and redirects.
 *
 * Rules:
 * 1. Local development and unit tests on localhost/127.0.0.1 stay local.
 * 2. If NEXT_PUBLIC_APP_URL is explicitly set to a non-local URL, prioritize it.
 * 3. In hosted environments (e.g. Vercel), if accessed via preview or alternate
 *    domains, enforce the canonical domain (https://ai20k-easy-game.vercel.app)
 *    so OAuth redirect matches Supabase's configured Site URL and allowed redirect URLs.
 * 4. Fallback to forwarded host when present, or the canonical production domain.
 */
export function resolveBaseUrl(request: Request): string {
  const { origin } = new URL(request.url);
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

  if (isLocal) {
    return origin;
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    configuredAppUrl &&
    !configuredAppUrl.includes("localhost") &&
    !configuredAppUrl.includes("127.0.0.1")
  ) {
    return configuredAppUrl.replace(/\/+$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = forwardedHost?.split(",")[0]?.trim();

  if (
    process.env.VERCEL &&
    host &&
    host.includes("vercel.app") &&
    host !== "ai20k-easy-game.vercel.app"
  ) {
    return PRODUCTION_APP_URL;
  }

  if (host) {
    return `${forwardedProto}://${host}`;
  }

  if (process.env.VERCEL) {
    return PRODUCTION_APP_URL;
  }

  return origin;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return (
    origin === new URL(request.url).origin ||
    (Boolean(process.env.NEXT_PUBLIC_APP_URL) &&
      origin === process.env.NEXT_PUBLIC_APP_URL) ||
    origin === PRODUCTION_APP_URL
  );
}
export function authorizedJob(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
