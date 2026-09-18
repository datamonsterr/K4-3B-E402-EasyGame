import { Suspense } from "react";
import { SignInCard } from "@/frontend/sign-in-card";

export default function SignInPage() {
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
