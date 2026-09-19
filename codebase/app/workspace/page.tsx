import { redirect } from "next/navigation";
import { configured, sessionClient } from "@/backend/database/client";
import { resolveActorContext } from "@/backend/auth/context";
import { WorkspaceShell } from "@/frontend/workspace/workspace-shell";

interface WorkspacePageProps {
  searchParams?: Promise<{
    preview?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function WorkspacePage(props?: WorkspacePageProps) {
  const searchParams = (await props?.searchParams) || {};
  const isSyntheticPreview =
    searchParams.preview === "synthetic" ||
    searchParams.preview === "true" ||
    !configured();

  if (isSyntheticPreview) {
    return (
      <WorkspaceShell
        initialUser="@SyntheticPreview"
        initialUserName="@SyntheticPreview"
        initialRole="learner"
      />
    );
  }

  let userName = "@Member";
  let initialRole: "learner" | "lab_coach" = "learner";
  let needsOnboarding = false;

  try {
    const supabase = await sessionClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (!user || userError) redirect("/sign-in?error=authentication_required");

    // Fetch user memberships gracefully
    let memberships: Array<{
      guild_id: string;
      user_id: string;
      role: "learner" | "lab_coach";
    }> = [];
    try {
      const { data: rawMemberships, error: membershipError } = await supabase
        .from("memberships")
        .select("guild_id,user_id,role")
        .eq("user_id", user.id)
        .order("guild_id", { ascending: true })
        .limit(2);

      if (membershipError) {
        console.warn(
          "WorkspacePage membership query warning:",
          membershipError.message,
        );
      } else {
        memberships = (rawMemberships ?? []) as Array<{
          guild_id: string;
          user_id: string;
          role: "learner" | "lab_coach";
        }>;
      }
    } catch (dbErr) {
      console.warn("WorkspacePage membership fetch exception:", dbErr);
    }

    if (memberships.length === 0) {
      // Authenticated user with no cohort membership yet:
      // Open onboarding modal directly in workspace shell rather than bouncing to sign-in
      needsOnboarding = true;
      initialRole = "learner";
    } else {
      const actorContext = await resolveActorContext({
        async getAuthenticatedUserId() {
          return user.id;
        },
        async listMemberships() {
          return memberships.map((m) => ({
            guildId: m.guild_id,
            userId: m.user_id,
            role: m.role,
          }));
        },
      });

      if (actorContext.type !== "ready") {
        redirect("/sign-in?error=membership_required");
      }
      initialRole = actorContext.actor.role;
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const metadataName = [
      metadata.global_name,
      metadata.full_name,
      metadata.user_name,
      metadata.name,
    ].find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    userName =
      metadataName ?? (user.email ? `@${user.email.split("@")[0]}` : "@Member");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("WorkspacePage authentication exception:", error);
    redirect("/sign-in?error=authentication_unavailable");
  }

  return (
    <WorkspaceShell
      initialUser={userName}
      initialUserName={userName}
      initialRole={initialRole}
      initialNeedsOnboarding={needsOnboarding}
    />
  );
}
