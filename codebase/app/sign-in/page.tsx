import { Suspense } from "react";
import { redirect } from "next/navigation";
import { configured, sessionClient } from "@/backend/database/client";
import { resolveActorContext } from "@/backend/auth/context";
import { SignInCard } from "@/frontend/sign-in-card";

interface SignInPageProps {
  searchParams?: Promise<{
    error?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function SignInPage(props: SignInPageProps) {
  const searchParams = (await props?.searchParams) || {};

  // If error is present in query parameters (e.g. membership_required),
  // do NOT redirect to /workspace. Display error on sign-in card to prevent redirect loops.
  if (!searchParams.error && configured()) {
    let shouldRedirect = false;
    try {
      const supabase = await sessionClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (user && !error) {
        // Only redirect if user has an active, ready membership
        const actorContext = await resolveActorContext({
          async getAuthenticatedUserId() {
            return user.id;
          },
          async listMemberships(userId) {
            const { data, error: membershipError } = await supabase
              .from("memberships")
              .select("guild_id,user_id,role")
              .eq("user_id", userId)
              .order("guild_id", { ascending: true })
              .limit(2);
            if (membershipError) throw membershipError;
            return (data ?? []).map((membership) => ({
              guildId: membership.guild_id,
              userId: membership.user_id,
              role: membership.role,
            }));
          },
        });

        if (actorContext.type === "ready") {
          shouldRedirect = true;
        }
      }
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e;
      // Session check failed or unauthenticated; render sign-in form
    }
    if (shouldRedirect) {
      redirect("/workspace");
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#09090b] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-cyan-400 font-mono text-xs">
            Loading sign-in…
          </div>
        }
      >
        <SignInCard />
      </Suspense>
    </main>
  );
}
