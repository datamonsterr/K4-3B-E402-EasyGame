"use client";
import { useState } from "react";
import Link from "next/link";
import type { AnswerResult } from "@/backend/assistant";
export function NoticeChecker() {
  const [topicKey, setTopic] = useState("lab-1");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function check(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/demo/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicKey }),
      });
      if (!response.ok)
        throw new Error("The notice could not be checked. Try again.");
      setResult(await response.json());
    } catch {
      setError("The notice could not be checked. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form onSubmit={check} className="notice-form">
        <div>
          <label htmlFor="milestone">Milestone</label>
          <select
            id="milestone"
            value={topicKey}
            onChange={(e) => {
              setTopic(e.target.value);
              setResult(null);
            }}
          >
            <option value="lab-1">Lab 1 deadline</option>
            <option value="lab-2">Lab 2 submission</option>
            <option value="lab-3">Lab 3 (no notice yet)</option>
          </select>
        </div>
        <button disabled={busy}>{busy ? "Checking…" : "Check notice"}</button>
      </form>
      <div className="answer" aria-live="polite">
        {error ? (
          <p role="alert">{error}</p>
        ) : result ? (
          <>
            <p className="answer-label">
              {result.status === "answered"
                ? "Latest verified notice"
                : result.status === "clarify"
                  ? "Needs clarification"
                  : "Lab Coach confirmation needed"}
            </p>
            <p className="answer-text">{result.text}</p>
            {result.source && (
              <Link className="source-link" href={result.source.href}>
                {result.source.label}
              </Link>
            )}
            <details>
              <summary>How this answer was selected</summary>
              <p>{result.summary}. This preview uses synthetic evidence.</p>
            </details>
          </>
        ) : (
          <p className="muted">
            Choose a milestone to check its latest notice. Every answer includes
            its source, or asks for confirmation.
          </p>
        )}
      </div>
    </>
  );
}
