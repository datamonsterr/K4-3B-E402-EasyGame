"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const initialDetails = searchParams.get("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    initialError
      ? `Authentication error: ${initialError}${initialDetails ? ` (${initialDetails})` : ""}`
      : "",
  );

  async function handleCredentialSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "Unable to sign in");
        return;
      }
      router.push("/workspace");
      router.refresh();
    } catch {
      setMessage("Sign-in service unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function handleOAuth(provider: "discord" | "google") {
    setBusy(true);
    setMessage("");
    // Direct through server route to guarantee PKCE verifier cookie headers
    window.location.href = `/api/auth/oauth?provider=${provider}&next=/workspace`;
  }

  return (
    <div className="w-full max-w-[400px] bg-[#121215] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4 text-[#e4e4e7] mx-auto">
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
          Access is derived from your operator-provisioned course membership.
        </p>
      </div>

      <form onSubmit={handleCredentialSubmit} className="space-y-3">
        <label className="block text-[11px] font-mono text-[#a1a1aa]">
          Email Address
          <input
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 w-full h-8 px-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-md text-white focus:outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block text-[11px] font-mono text-[#a1a1aa]">
          Password
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-1 w-full h-8 px-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-md text-white focus:outline-none focus:border-cyan-500"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full h-8 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-md disabled:opacity-50"
        >
          {busy ? "Authenticating…" : "Sign In with Credentials"}
        </button>
      </form>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-[#27272a] w-full" />
        <span className="bg-[#121215] px-2 text-[9px] font-mono text-[#71717a] uppercase absolute">
          Or Continue With
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleOAuth("discord")}
          disabled={busy}
          className="h-8 rounded-md bg-[#5865F2] text-white text-xs font-medium disabled:opacity-50"
        >
          Discord SSO
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={busy}
          className="h-8 rounded-md bg-white text-[#18181b] text-xs font-medium disabled:opacity-50"
        >
          Google SSO
        </button>
      </div>

      <button
        type="button"
        onClick={() => router.push("/workspace?preview=synthetic")}
        className="w-full h-8 rounded-md border border-[#3f3f46] text-xs text-[#a1a1aa] hover:text-white"
      >
        Open synthetic preview
      </button>

      {message && (
        <p
          role="status"
          className="text-xs text-center font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 rounded p-2"
        >
          {message}
        </p>
      )}
    </div>
  );
}
