import { NextResponse } from "next/server";
import { sessionClient, configured } from "@/backend/database/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/workspace";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const message = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${origin}/sign-in?error=${message}`);
  }

  if (code && configured()) {
    try {
      const supabase = await sessionClient();
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError) {
        // Ensure default membership in guild
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: existing } = await supabase
            .from("memberships")
            .select("role")
            .eq("user_id", user.id);
          if (!existing || existing.length === 0) {
            const { data: guilds } = await supabase
              .from("guilds")
              .select("id")
              .limit(1);
            if (guilds && guilds.length > 0) {
              await supabase.from("memberships").insert({
                guild_id: guilds[0].id,
                user_id: user.id,
                role: "learner",
              });
            }
          }
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // Fall through to redirect
    }
  }

  // If no code or exchange failed, redirect to sign-in with clear query
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
