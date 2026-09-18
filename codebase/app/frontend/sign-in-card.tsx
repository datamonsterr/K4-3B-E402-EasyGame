"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "./supabase-browser";

export function SignInCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"learner" | "lab_coach">("learner");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    initialError ? `Authentication error: ${initialError}` : "",
  );

  function setDemoCookiesAndStorage(
    targetRole: "learner" | "lab_coach",
    targetName: string,
  ) {
    localStorage.setItem("eg_demo_role", targetRole);
    localStorage.setItem("eg_demo_name", targetName);
    if (typeof document !== "undefined") {
      document.cookie = `eg_demo_role=${targetRole}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `eg_demo_name=${encodeURIComponent(targetName)}; path=/; max-age=86400; SameSite=Lax`;
    }
  }

  async function handleCredentialSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      await res.json();

      if (!res.ok) {
        // Fallback for local synthetic / demo accounts if backend rejects
        if (email.includes("coach") || email.includes("ta")) {
          setDemoCookiesAndStorage("lab_coach", "@TA_MinhHai");
          router.push("/workspace");
          return;
        } else {
          setDemoCookiesAndStorage("learner", "@NguyenVanAn");
          router.push("/workspace");
          return;
        }
      }

      // Update role in database
      await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const personaName = role === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn";
      setDemoCookiesAndStorage(role, personaName);

      router.push("/workspace");
    } catch {
      setMessage("Sign-in service unavailable. Proceeding with demo session.");
      const personaName = role === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn";
      setDemoCookiesAndStorage(role, personaName);
      router.push("/workspace");
    } finally {
      setBusy(false);
    }
  }

  function fastDemoLogin(selectedRole: "learner" | "lab_coach") {
    setBusy(true);
    const personaName =
      selectedRole === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn";
    setDemoCookiesAndStorage(selectedRole, personaName);

    // Also try updating database role
    fetch("/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selectedRole }),
    }).catch(() => {});

    setTimeout(() => {
      router.push("/workspace");
    }, 200);
  }

  async function handleOAuth(provider: "discord" | "google") {
    setBusy(true);
    setMessage("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Offline / preview / demo fallback when Supabase keys are absent
      const targetName =
        provider === "discord" ? "@DiscordLearner" : "@GoogleLearner";
      setDemoCookiesAndStorage(role, targetName);
      router.push("/workspace");
      return;
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback?provider=${provider}&role=${role}&next=/workspace`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        setMessage(`OAuth error: ${error.message}`);
        setBusy(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "SSO authentication error";
      setMessage(msg);
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] bg-[#121215] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4 text-[#e4e4e7] mx-auto">
      {/* Wordmark Header - Strictly NO graphic logo */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight text-white">
            EasyGame
          </span>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            Track B
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#71717a]">
          Verified Logistics AI
        </span>
      </div>

      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          Sign In to Workspace
        </h1>
        <p className="text-xs text-[#a1a1aa] leading-snug">
          Authenticate to access verified course notices and question triage
          radar.
        </p>
      </div>

      {/* Quick Demo Persona Switcher - Two compact, centered cards */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 space-y-2">
        <div className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider text-center">
          Quick Demo Credentials (One-Click)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fastDemoLogin("learner")}
            disabled={busy}
            className="p-2 rounded-md bg-[#202024] hover:bg-[#27272a] border border-[#3f3f46] hover:border-cyan-500/60 text-center transition flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] disabled:opacity-50"
          >
            <span className="text-cyan-400 font-semibold text-xs flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Learner
            </span>
            <span className="text-[10px] font-mono text-[#a1a1aa]">
              @NguyenVanAn
            </span>
          </button>
          <button
            type="button"
            onClick={() => fastDemoLogin("lab_coach")}
            disabled={busy}
            className="p-2 rounded-md bg-[#202024] hover:bg-[#27272a] border border-[#3f3f46] hover:border-amber-500/60 text-center transition flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] disabled:opacity-50"
          >
            <span className="text-amber-400 font-semibold text-xs flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Lab Coach
            </span>
            <span className="text-[10px] font-mono text-[#a1a1aa]">
              @TA_MinhHai
            </span>
          </button>
        </div>
      </div>

      {/* Credential Form */}
      <form onSubmit={handleCredentialSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="email"
            className="block text-[11px] font-mono text-[#a1a1aa] mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@vinuni.edu.vn"
            required
            className="w-full h-8 px-2.5 py-1.5 text-xs bg-[#18181b] border border-[#27272a] rounded-md text-white placeholder-[#71717a] focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[11px] font-mono text-[#a1a1aa] mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            className="w-full h-8 px-2.5 py-1.5 text-xs bg-[#18181b] border border-[#27272a] rounded-md text-white placeholder-[#71717a] focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Cohort Role Toggle - Compact segmented control (h-[28px]) */}
        <div>
          <label className="block text-[11px] font-mono text-[#a1a1aa] mb-1">
            Initial Cohort Role (Stored in DB)
          </label>
          <div className="h-[28px] grid grid-cols-2 gap-1 bg-[#18181b] p-0.5 rounded-md border border-[#27272a]">
            <button
              type="button"
              onClick={() => setRole("learner")}
              className={`h-full flex items-center justify-center text-[11px] rounded transition font-medium ${
                role === "learner"
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Learner (Chat)
            </button>
            <button
              type="button"
              onClick={() => setRole("lab_coach")}
              className={`h-full flex items-center justify-center text-[11px] rounded transition font-medium ${
                role === "lab_coach"
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Lab Coach (Radar)
            </button>
          </div>
        </div>

        {/* Compact submit button (h-8) */}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-8 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-md transition shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
        >
          {busy ? "Authenticating…" : "Sign In with Credentials"}
        </button>
      </form>

      {/* SSO Dividers */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-[#27272a] w-full"></div>
        <span className="bg-[#121215] px-2 text-[9px] font-mono text-[#71717a] uppercase absolute">
          Or Continue With
        </span>
      </div>

      {/* Discord & Google SSO Compact Buttons (h-8) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleOAuth("discord")}
          disabled={busy}
          className="h-8 w-full flex items-center justify-center gap-1.5 px-2 rounded-md bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-medium transition active:scale-[0.98] disabled:opacity-50"
        >
          <svg
            className="w-3.5 h-3.5 fill-current flex-shrink-0"
            viewBox="0 0 127.14 96.36"
            aria-hidden="true"
          >
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
          </svg>
          <span>Discord SSO</span>
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={busy}
          className="h-8 w-full flex items-center justify-center gap-1.5 px-2 rounded-md bg-[#FFFFFF] hover:bg-[#f4f4f5] text-[#18181b] text-xs font-medium border border-zinc-300 transition active:scale-[0.98] disabled:opacity-50 shadow-sm"
        >
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google SSO</span>
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="text-xs text-center font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 rounded p-2"
        >
          {message}
        </p>
      )}

      {/* Footer link to static mock */}
      <div className="text-center pt-1 border-t border-[#27272a]">
        <a
          href="/mock/index.html"
          className="text-[10px] font-mono text-[#71717a] hover:text-cyan-400 transition"
        >
          Static Prototype & Architecture Specs ↗
        </a>
      </div>
    </div>
  );
}
