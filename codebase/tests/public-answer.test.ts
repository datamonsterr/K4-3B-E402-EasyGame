import { describe, expect, it } from "vitest";
import { toAssistantMessage } from "../app/frontend/workspace/public-answer";

describe("public answer rendering", () => {
  it("keeps an authentic answered source", () => {
    const view = toAssistantMessage({
      status: "answered",
      body: "Verified answer.",
      source: { label: "Notice", href: "/sources/n", kind: "pack" },
      decisionSummary: "Selected latest verified guild notice",
    });
    expect(view.sources).toEqual([
      { label: "Notice", href: "/sources/n", icon: "📌" },
    ]);
    expect(view.isGrounded).toBe(true);
  });

  it.each(["clarify", "fallback", "refused"] as const)(
    "never fabricates a source for %s",
    (status) => {
      const response =
        status === "fallback"
          ? {
              status: "fallback" as const,
              body: "Safe response.",
              source: null,
              alert: "not_queued" as const,
              decisionSummary: "Safe outcome",
            }
          : {
              status,
              body: "Safe response.",
              source: null,
              decisionSummary: "Safe outcome",
            };
      const view = toAssistantMessage(response);
      expect(view.sources).toEqual([]);
      expect(view.isGrounded).toBe(false);
    },
  );
});
