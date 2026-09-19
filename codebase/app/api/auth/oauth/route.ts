import { NextResponse } from "next/server";
import { configured, sessionClient } from "@/backend/database/client";
import { resolveBaseUrl } from "@/backend/auth/http";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext && /^\/(?!\/)/.test(requestedNext)
      ? requestedNext
      : "/workspace";

  const baseUrl = resolveBaseUrl(request);

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
