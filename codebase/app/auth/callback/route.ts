import { NextResponse } from "next/server";
import { sessionClient, configured } from "@/backend/database/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Determine base URL, respecting reverse proxy and forwarded headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  const host = forwardedHost?.split(",")[0]?.trim();
  const baseUrl = host && !isLocal ? `${forwardedProto}://${host}` : origin;

  // Sanitized redirect destination to prevent open redirects
  const safeNext =
    requestedNext && /^\/(?!\/)/.test(requestedNext)
      ? requestedNext
      : "/workspace";

  if (error) {
    const message = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${baseUrl}/sign-in?error=${message}`);
  }

  if (code && configured()) {
    try {
      const supabase = await sessionClient();
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Supabase exchangeCodeForSession failed:", exchangeError);
        return NextResponse.redirect(
          `${baseUrl}/sign-in?error=auth_callback_failed&details=${encodeURIComponent(
            exchangeError.message || "exchange_failed",
          )}`,
        );
      }

      if (data?.session) {
        return NextResponse.redirect(`${baseUrl}${safeNext}`);
      }
    } catch (err: unknown) {
      console.error("Supabase auth callback exception:", err);
      const msg = err instanceof Error ? err.message : "auth_callback_failed";
      return NextResponse.redirect(
        `${baseUrl}/sign-in?error=auth_callback_failed&details=${encodeURIComponent(msg)}`,
      );
    }
  }

  // If no code or exchange failed, redirect to sign-in with clear query
  return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback_failed`);
}
