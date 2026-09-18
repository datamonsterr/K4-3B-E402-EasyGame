import { NextResponse } from "next/server";
import { sessionClient, configured } from "@/backend/database/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/workspace";
  const roleParam = searchParams.get("role");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Determine base URL, respecting reverse proxy and forwarded headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  const baseUrl =
    forwardedHost && !isLocal ? `${forwardedProto}://${forwardedHost}` : origin;

  // Sanitized redirect destination to prevent open redirects
  const safeNext = next.startsWith("/") ? next : "/workspace";

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

        const targetRole: "learner" | "lab_coach" =
          roleParam === "lab_coach" ? "lab_coach" : "learner";

        let displayName =
          targetRole === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn";

        if (user) {
          const meta = (user.user_metadata || {}) as Record<string, unknown>;
          const extractedName =
            (meta.global_name as string | undefined) ||
            (meta.full_name as string | undefined) ||
            (meta.user_name as string | undefined) ||
            (meta.name as string | undefined) ||
            (user.email ? `@${user.email.split("@")[0]}` : undefined);

          if (extractedName) {
            displayName = extractedName;
          }

          // Ensure membership exists in guild
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
                role: targetRole,
              });
            }
          }
        }

        const response = NextResponse.redirect(`${baseUrl}${safeNext}`);
        response.cookies.set("eg_demo_role", targetRole, {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
        response.cookies.set("eg_demo_name", encodeURIComponent(displayName), {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
        return response;
      }
    } catch {
      // Fall through to error redirect
    }
  }

  // If no code or exchange failed, redirect to sign-in with clear query
  return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback_failed`);
}
