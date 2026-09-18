import "server-only";
import { timingSafeEqual } from "node:crypto";
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return (
    origin === new URL(request.url).origin ||
    (Boolean(process.env.NEXT_PUBLIC_APP_URL) &&
      origin === process.env.NEXT_PUBLIC_APP_URL)
  );
}
export function authorizedJob(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
