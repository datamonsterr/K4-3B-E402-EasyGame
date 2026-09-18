import { redirect } from "next/navigation";
import { configured, sessionClient } from "@/backend/database/client";
import { resolveActorContext } from "@/backend/auth/context";
import { WorkspaceShell } from "@/frontend/workspace/workspace-shell";

export default async function WorkspacePage() {
  if (!configured()) {
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

  try {
    const supabase = await sessionClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (!user || userError) redirect("/sign-in?error=authentication_required");

    const actorContext = await resolveActorContext({
      async getAuthenticatedUserId() {
        return user.id;
      },
      async listMemberships(userId) {
        const { data, error } = await supabase
          .from("memberships")
          .select("guild_id,user_id,role")
          .eq("user_id", userId)
          .order("guild_id", { ascending: true })
          .limit(2);
        if (error) throw error;
        return (data ?? []).map((membership) => ({
          guildId: membership.guild_id,
          userId: membership.user_id,
          role: membership.role,
        }));
      },
    });
    if (actorContext.type !== "ready") {
      redirect("/sign-in?error=membership_required");
    }

    const metadata = user.user_metadata as Record<string, unknown>;
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
    initialRole = actorContext.actor.role;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/sign-in?error=authentication_unavailable");
  }

  return (
    <WorkspaceShell
      initialUser={userName}
      initialUserName={userName}
      initialRole={initialRole}
    />
  );
}
