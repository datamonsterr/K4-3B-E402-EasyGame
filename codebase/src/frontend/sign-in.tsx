"use client";
import { useState } from "react";
export function SignIn() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const result = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await result.json();
      if (!result.ok) {
        setMessage(data.error);
        return;
      }
      const profile = await fetch("/api/auth/me");
      const actor = await profile.json();
      setMessage(
        profile.ok
          ? `Signed in as ${actor.email}. ${actor.memberships.length} cohort membership(s).`
          : "Signed in. Membership lookup is unavailable.",
      );
    } catch {
      setMessage("Sign-in is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="login-form" onSubmit={submit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          name="email"
          id="email"
          type="email"
          required
          autoComplete="username"
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          name="password"
          id="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p role="status">{message}</p>
    </form>
  );
}
