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
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: rawMemberships, error: membershipError } = await supabase
          .from("memberships")
          .select("guild_id,user_id,role")
          .eq("user_id", user?.id ?? "")
          .order("guild_id", { ascending: true })
          .limit(2);
        if (membershipError) throw membershipError;

        const memberships = rawMemberships ?? [];
        if (memberships.length > 1) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${baseUrl}/sign-in?error=membership_required`,
          );
        }

        return NextResponse.redirect(`${baseUrl}${safeNext}`);
      }
    } catch {
      // Fall through to error redirect
    }
  }

  // If no code or exchange failed, redirect to sign-in with clear query
  return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback_failed`);
}
