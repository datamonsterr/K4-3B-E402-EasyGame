import { describe, expect, it, vi } from "vitest";
import {
  recordAgentExecution,
  recordAgentFailure,
} from "../app/backend/assistant/observability";

const actor = {
  userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  guildId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  role: "learner" as const,
};

describe("safe agent observability", () => {
  it("sends only bounded allowlisted fields to the authenticated recorder RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: "11111111-1111-4111-8111-111111111111",
      error: null,
    }));
    const runId = await recordAgentExecution({ rpc } as never, actor as never, {
      answer: {
        status: "completed",
        body: "Đã xử lý.",
        source: null,
        decisionSummary: "Radar workflow completed",
      },
      trace: [
        { type: "decision", summary: "Use radar" },
        { type: "tool_call", tool: "evaluate_radar", summary: "Evaluate" },
        { type: "observation", tool: "evaluate_radar", summary: "Two overdue" },
      ],
      provider: "gemini",
      model: "gemini-live",
      providerAttempted: true,
      providerSucceeded: true,
      executionMode: "live_provider",
      latencyMs: 42,
      selectedNoticeId: "22222222-2222-4222-8222-222222222222",
    });
    expect(runId).toMatch(/^[0-9a-f-]{36}$/);
    const serialized = JSON.stringify(rpc.mock.calls[0]);
    expect(serialized).toContain("record_agent_run");
    expect(serialized).toContain(actor.userId);
    expect(serialized).toContain(actor.guildId);
    expect(serialized).toContain("22222222-2222-4222-8222-222222222222");
    expect(serialized).not.toMatch(
      /prompt|thoughtProcess|chainOfThought|rawProviderResponse|accessToken|cookie/i,
    );
  });

  it("rejects unsafe trace summaries before persistence", async () => {
    await expect(
      recordAgentExecution({ rpc: vi.fn() } as never, actor as never, {
        answer: {
          status: "clarify",
          body: "Clarify",
          source: null,
          decisionSummary: "Clarify",
        },
        trace: [{ type: "decision", summary: "Bearer secret-token" }],
        provider: "gemini",
        model: "model",
        providerAttempted: true,
        providerSucceeded: true,
        executionMode: "live_provider",
        latencyMs: 1,
      }),
    ).rejects.toThrow(/unsafe/i);
  });

  it("records a generic failed execution without persisting the thrown error", async () => {
    const rpc = vi.fn(async () => ({
      data: "11111111-1111-4111-8111-111111111111",
      error: null,
    }));
    await recordAgentFailure({ rpc } as never, actor as never, {
      provider: "gemini",
      model: "gemini-live",
      latencyMs: 15,
    });
    const serialized = JSON.stringify(rpc.mock.calls[0]);
    expect(serialized).toContain('"p_status":"error"');
    expect(serialized).toContain("Agent execution failed");
    expect(serialized).not.toMatch(/password|provider unavailable|stack/i);
  });
});
