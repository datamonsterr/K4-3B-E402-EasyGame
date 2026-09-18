import { NextResponse } from "next/server";
import { configured, sessionClient } from "@/backend/database/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const provider = searchParams.get("provider");
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext && /^\/(?!\/)/.test(requestedNext)
      ? requestedNext
      : "/workspace";

  // Resolve base URL even behind reverse proxy / forwarded headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  const host = forwardedHost?.split(",")[0]?.trim();
  const baseUrl = host && !isLocal ? `${forwardedProto}://${host}` : origin;

  if (provider !== "discord" && provider !== "google") {
    return NextResponse.redirect(
      `${baseUrl}/sign-in?error=${encodeURIComponent(
        "Unsupported OAuth provider. Only Discord and Google are supported.",
      )}`,
    );
  }

  if (!configured()) {
    return NextResponse.redirect(
      `${baseUrl}/sign-in?error=${encodeURIComponent(
        `${provider === "discord" ? "Discord" : "Google"} SSO requires configured Supabase credentials.`,
      )}`,
    );
  }

  try {
    const supabase = await sessionClient();
    const redirectTo = `${baseUrl}/auth/callback?provider=${provider}&next=${encodeURIComponent(
      next,
    )}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error || !data?.url) {
      return NextResponse.redirect(
        `${baseUrl}/sign-in?error=${encodeURIComponent(
          error?.message || "Failed to initialize Supabase OAuth session.",
        )}`,
      );
    }

    return NextResponse.redirect(data.url);
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "OAuth initiation encountered an error";
    return NextResponse.redirect(
      `${baseUrl}/sign-in?error=${encodeURIComponent(msg)}`,
    );
  }
}
