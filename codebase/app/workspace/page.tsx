import { cookies } from "next/headers";
import { configured, sessionClient } from "@/backend/database/client";
import { WorkspaceShell } from "@/frontend/workspace/workspace-shell";

export default async function WorkspacePage() {
  let initialRole: "learner" | "lab_coach" = "learner";
  let initialUserName = "@NguyenVanAn";

  const cookieStore = await cookies();
  const cookieRole =
    cookieStore.get("eg_demo_role")?.value ?? cookieStore.get("role")?.value;
  const cookieName =
    cookieStore.get("eg_demo_name")?.value ?? cookieStore.get("user")?.value;

  if (cookieRole === "lab_coach" || cookieRole === "learner") {
    initialRole = cookieRole;
    initialUserName =
      cookieRole === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn";
  }
  if (cookieName) {
    initialUserName = decodeURIComponent(cookieName);
  }

  if (configured()) {
    try {
      const supabase = await sessionClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (user && !error) {
        const resolvedName =
          (user.user_metadata?.user_name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          (user.email ? `@${user.email.split("@")[0]}` : undefined);
        if (resolvedName) {
          initialUserName = resolvedName;
        }

        const { data: membership } = await supabase
          .from("memberships")
          .select("role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (
          membership?.role === "learner" ||
          membership?.role === "lab_coach"
        ) {
          initialRole = membership.role;
        }
      }
    } catch {
      // Graceful fallback for demo mode or unexpected errors
    }
  }

  return (
    <WorkspaceShell
      initialUser={initialUserName}
      initialUserName={initialUserName}
      initialRole={initialRole}
    />
  );
}
