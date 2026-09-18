import { Suspense } from "react";
import { redirect } from "next/navigation";
import { configured, sessionClient } from "@/backend/database/client";
import { SignInCard } from "@/frontend/sign-in-card";

export default async function SignInPage() {
  if (configured()) {
    let shouldRedirect = false;
    try {
      const supabase = await sessionClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user && !error) {
        shouldRedirect = true;
      }
    } catch {
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
