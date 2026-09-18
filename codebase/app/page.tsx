import { redirect } from "next/navigation";
import { configured, sessionClient } from "@/backend/database/client";

interface PageProps {
  searchParams?: Promise<{
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function Home(props: PageProps) {
  const searchParams = (await props?.searchParams) || {};

  // If OAuth code or error returned to root / (e.g. via Supabase default Site URL fallback)
  if (searchParams.code || searchParams.error) {
    const forwardParams = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) forwardParams.set(k, v);
    }
    if (!forwardParams.has("next")) {
      forwardParams.set("next", "/workspace");
    }
    redirect(`/auth/callback?${forwardParams.toString()}`);
  }

  // If already authenticated with Supabase session, land directly on agent main page (/workspace)
  if (configured()) {
    try {
      const supabase = await sessionClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user && !error) {
        const { data: rawMemberships } = await supabase
          .from("memberships")
          .select("guild_id")
          .eq("user_id", user.id)
          .limit(2);
        if ((rawMemberships ?? []).length > 1) {
          redirect("/sign-in?error=membership_required");
        }
        redirect("/workspace");
      }
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e;
      // Session unavailable or unconfigured, proceed to sign-in
    }
  }

  // Requirement 1: First page must redirect to /sign-in for unauthenticated visitors
  redirect("/sign-in");
}
