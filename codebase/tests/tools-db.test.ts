import { describe, expect, it, beforeEach } from "vitest";
import {
  executeQueryNotices,
  executeEvaluateRadar,
  executeCreateStaffAlert,
  executeResolveQuestion,
  executeFormatDailyDigest,
  executeSearchWeb,
  executeTool,
  sanitizeVietnamese,
  getStaffAlerts,
  clearStaffAlerts,
  resetMemoryQuestions,
  getToolDbClient,
  type CreateStaffAlertArgs,
  type ResolveQuestionArgs,
  type FormatDailyDigestArgs,
  type QueryNoticesOutput,
  type EvaluateRadarOutput,
  type StaffAlert,
  type ResolveQuestionOutput,
  type DailyDigestOutput,
  type SearchWebOutput,
} from "../src/backend/tools";
import type { Notice } from "../src/backend/assistant";
import type { RadarQuestion } from "../src/backend/radar";

describe("Database & Tool Integration", () => {
  beforeEach(async () => {
    clearStaffAlerts();
    resetMemoryQuestions();
    const dbClient = getToolDbClient();
    if (dbClient) {
      await dbClient
        .from("questions")
        .update({ status: "open", version: 0, resolved_at: null })
        .eq("id", "30000000-0000-0000-0000-000000000003");
    }
  });

  describe("query_notices tool & timestamp conflict resolution", () => {
    it("queries verified notices from Supabase database when configured", async () => {
      const dbClient = getToolDbClient();
      if (!dbClient) {
        console.warn("Supabase not configured, skipping live DB query");
        return;
      }

      const result = await executeQueryNotices({
        guildId: "A",
        topicKey: "cvat",
      });

      expect(result.status).toBe("answered");
      expect(result.text).toContain("CVAT setup guide");
      expect(result.matchedCount).toBeGreaterThanOrEqual(1);
      expect(result.latestNotice?.topicKey).toBe("cvat");
    });

    it("resolves timestamp conflicts: latest notice by published_at wins", async () => {
      const dbClient = getToolDbClient();
      if (!dbClient) {
        console.warn("Supabase not configured, skipping live DB query");
        return;
      }

      // In seed data: Lab 1 original is Sep 17 21:00, Lab 1 extension is Sep 19 12:00
      const result = await executeQueryNotices({
        guildId: "A",
        topicKey: "lab-1",
      });

      expect(result.status).toBe("answered");
      // The extension (Sep 19 12:00) must win over the original (Sep 17 21:00)
      expect(result.text).toContain("12:00 on September 19, 2026");
      expect(result.matchedCount).toBe(2);
      expect(
        new Date(result.latestNotice?.publishedAt ?? "").toISOString(),
      ).toBe("2026-09-19T05:00:00.000Z");
    });

    it("falls back to fixtures when database has no matches", async () => {
      const result = await executeQueryNotices({
        guildId: "demo",
        topicKey: "lab-2",
      });

      expect(result.status).toBe("answered");
      expect(result.text).toContain("Submit Lab 2 through the course portal");
    });

    it("clarifies when two latest notices share identical timestamps but conflicting content", async () => {
      const conflictingEvidence: Notice[] = [
        {
          id: "n-1",
          guildId: "g-test",
          topicKey: "lab-3",
          publishedAt: "2026-09-20T10:00:00Z",
          verified: true,
          answer: "Lab 3 is due at 10:00.",
          source: { label: "Source 1", href: "/sources/1", kind: "synthetic" },
        },
        {
          id: "n-2",
          guildId: "g-test",
          topicKey: "lab-3",
          publishedAt: "2026-09-20T10:00:00Z",
          verified: true,
          answer: "Lab 3 is due at 18:00.",
          source: { label: "Source 2", href: "/sources/2", kind: "synthetic" },
        },
      ];

      const result = await executeQueryNotices(
        { guildId: "g-test", topicKey: "lab-3" },
        conflictingEvidence,
      );

      expect(result.status).toBe("clarify");
      expect(result.summary).toBe("Conflicting notices share a timestamp");
    });
  });

  describe("evaluate_radar tool & SLA calculations", () => {
    const scanTime = "2026-09-18T12:00:00Z";

    it("queries questions from Supabase, excludes resolved, and computes SLA tiers", async () => {
      const dbClient = getToolDbClient();
      if (!dbClient) {
        console.warn("Supabase not configured, skipping live DB query");
        return;
      }

      const result = await executeEvaluateRadar({
        guildId: "A",
        now: scanTime,
      });

      expect(result.guildId).toBe("A");
      expect(new Date(result.evaluatedAt).toISOString()).toBe(
        new Date(scanTime).toISOString(),
      );

      // Verify resolved question is excluded from active items
      const resolvedItem = result.items.find((i) => i.status === "resolved");
      expect(resolvedItem).toBeUndefined();

      // Verify answered question is retained
      const answeredItem = result.items.find((i) => i.status === "answered");
      expect(answeredItem).toBeDefined();

      // Verify claimed question is retained
      const claimedItem = result.items.find((i) => i.status === "claimed");
      expect(claimedItem).toBeDefined();

      // Check SLA metrics
      expect(result.metrics.urgentBreaches).toBeGreaterThanOrEqual(1); // >=240m
      expect(result.metrics.softWarnings).toBeGreaterThanOrEqual(1); // >=120m
      expect(result.metrics.totalActive).toBe(result.items.length);
      expect(result.metrics.compliance).toMatch(/^\d+\.\d+%$/);
      expect(result.metrics.resolvedToday).toContain("/");
    });

    it("evaluates custom questions honoring exact SLA thresholds: Tier 1 (120m), Tier 2 (240m)", async () => {
      const questions: RadarQuestion[] = [
        { id: "urgent-breach", sentAt: "2026-09-18T07:00:00Z", status: "open" }, // 300m -> Tier 2
        {
          id: "exact-urgent",
          sentAt: "2026-09-18T08:00:00Z",
          status: "answered",
        }, // 240m -> Tier 2
        {
          id: "soft-warning",
          sentAt: "2026-09-18T09:30:00Z",
          status: "claimed",
        }, // 150m -> Tier 1
        { id: "exact-soft", sentAt: "2026-09-18T10:00:00Z", status: "open" }, // 120m -> Tier 1
        { id: "normal-open", sentAt: "2026-09-18T11:00:00Z", status: "open" }, // 60m -> Tier 0
        {
          id: "already-done",
          sentAt: "2026-09-18T05:00:00Z",
          status: "resolved",
        }, // Excluded
      ];

      const result = await executeEvaluateRadar(
        { guildId: "test-guild", now: scanTime },
        questions,
      );

      expect(result.items).toHaveLength(5);
      expect(result.items.map((i) => [i.id, i.tier])).toEqual([
        ["urgent-breach", 2],
        ["exact-urgent", 2],
        ["soft-warning", 1],
        ["exact-soft", 1],
        ["normal-open", 0],
      ]);

      expect(result.metrics.urgentBreaches).toBe(2);
      expect(result.metrics.softWarnings).toBe(2);
      expect(result.metrics.totalActive).toBe(5);
      expect(result.metrics.resolvedToday).toBe("1/6");
    });
  });

  describe("create_staff_alert tool", () => {
    it("creates a staff alert in database or memory store", async () => {
      const args: CreateStaffAlertArgs = {
        guildId: "A",
        questionId: "30000000-0000-0000-0000-000000000001",
        tier: 2,
        summary: "Urgent CVAT HTTP 500 error needs coach assistance",
      };

      const alert = await executeCreateStaffAlert(args);

      expect(alert).toBeDefined();
      expect(alert.questionId).toBe(args.questionId);
      expect(alert.tier).toBe(2);
      expect(alert.summary).toBe(args.summary);
      expect(alert.createdAt).toBeDefined();

      const alerts = getStaffAlerts("A");
      expect(alerts).toHaveLength(1);
      expect(alerts[0].questionId).toBe(args.questionId);
    });
  });

  describe("resolve_question tool & optimistic concurrency", () => {
    it("resolves a question successfully with authorized coach role", async () => {
      const args: ResolveQuestionArgs = {
        questionId: "30000000-0000-0000-0000-000000000003",
        expectedVersion: 0,
        actorRole: "lab_coach",
      };

      const output = await executeResolveQuestion(args);

      expect(output.success).toBe(true);
      expect(output.questionId).toBe(args.questionId);
      expect(output.newVersion).toBe(1);
      expect(output.resolvedAt).toBeDefined();
    });

    it("rejects unauthorized learner role", async () => {
      const args: ResolveQuestionArgs = {
        questionId: "test-question-auth",
        expectedVersion: 0,
        actorRole: "learner",
      };

      await expect(executeResolveQuestion(args)).rejects.toThrow(
        "Only an authorized Lab Coach can resolve tickets",
      );
    });

    it("enforces optimistic concurrency: rejects outdated version", async () => {
      const qId = "optimistic-test-q";
      // First resolution from v0 -> v1
      await executeResolveQuestion({
        questionId: qId,
        expectedVersion: 0,
        actorRole: "lab_coach",
      });

      // Second attempt with stale version 0 must throw
      await expect(
        executeResolveQuestion({
          questionId: qId,
          expectedVersion: 0,
          actorRole: "lab_coach",
        }),
      ).rejects.toThrow();
    });
  });

  describe("format_daily_digest tool & Vietnamese token sanitization", () => {
    it("strips 'nguồn tham chiếu' tokens and collapses multiple spaces", () => {
      const dirty =
        "Bản tin ca trực nguồn tham chiếu 22:00:    Đã cập nhật   thời hạn Lab 1. Nguồn Tham Chiếu  hoàn tất.";
      const clean = sanitizeVietnamese(dirty);

      expect(clean).not.toContain("nguồn tham chiếu");
      expect(clean).not.toContain("Nguồn Tham Chiếu");
      expect(clean).not.toMatch(/\s{2,}/);
      expect(clean).toBe(
        "Bản tin ca trực 22:00: Đã cập nhật thời hạn Lab 1. hoàn tất.",
      );
    });

    it("formats 22:00 daily digest with topic grouping and sanitization", async () => {
      const args: FormatDailyDigestArgs = {
        guildId: "A",
        localDate: "2026-09-18",
        topics: [
          { topic: "Lab 1 Submission Issues", count: 12 },
          { topic: "CVAT Docker Setup", count: 7 },
        ],
        rawSummary:
          "Tổng kết ca trực  nguồn tham chiếu   ngày 18/09/2026: Đã hỗ trợ 19 câu hỏi.",
      };

      const digest = await executeFormatDailyDigest(args);

      expect(digest.guildId).toBe("A");
      expect(digest.localDate).toBe("2026-09-18");
      expect(digest.title).toContain("2026-09-18");
      expect(digest.sanitizedSummary).not.toContain("nguồn tham chiếu");
      expect(digest.sanitizedSummary).not.toMatch(/\s{2,}/);
      expect(digest.rankedTopics[0].topic).toBe("Lab 1 Submission Issues");
      expect(digest.rankedTopics[0].rank).toBe(1);
    });
  });

  describe("search_web tool (Tavily API)", () => {
    it("executes web search using mock fetcher returning structured results", async () => {
      const mockFetcher: typeof fetch = async () => {
        return new Response(
          JSON.stringify({
            query: "VinUniversity computer science",
            results: [
              {
                title: "VinUni College of Engineering and Computer Science",
                url: "https://vinuni.edu.vn/cecs/",
                content:
                  "CECS offers programs in Computer Science and Data Science.",
                score: 0.95,
              },
            ],
            answer:
              "VinUniversity CECS offers leading computer science programs.",
            response_time: 0.8,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };

      const result = await executeSearchWeb(
        { query: "VinUniversity computer science" },
        { apiKey: "test-key", fetcher: mockFetcher },
      );

      expect(result.query).toBe("VinUniversity computer science");
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toContain("VinUni");
      expect(result.results[0].url).toBe("https://vinuni.edu.vn/cecs/");
      expect(result.answer).toContain("VinUniversity");
    });

    it("rejects empty search queries", async () => {
      await expect(
        executeSearchWeb({ query: "   " }, { apiKey: "test-key" }),
      ).rejects.toThrow("Search query cannot be empty");
    });

    it("throws error when TAVILY_API_KEY is missing", async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      delete process.env.TAVILY_API_KEY;

      try {
        await expect(
          executeSearchWeb(
            { query: "test query" },
            { allowSyntheticFallback: false },
          ),
        ).rejects.toThrow("TAVILY_API_KEY is not configured");
      } finally {
        if (originalKey) process.env.TAVILY_API_KEY = originalKey;
      }
    });

    it("executes live Tavily web search with environment key", async () => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        console.warn(
          "TAVILY_API_KEY not found in environment, skipping live test",
        );
        return;
      }

      const result = await executeSearchWeb({
        query: "VinUniversity Vietnam",
        maxResults: 2,
      });

      expect(result.query).toBe("VinUniversity Vietnam");
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].url).toMatch(/^https?:\/\//);
      expect(result.results[0].title).toBeDefined();
    });
  });

  describe("executeTool universal dispatcher", () => {
    it("dispatches query_notices", async () => {
      const dbClient = getToolDbClient();
      if (!dbClient) {
        console.warn("Supabase not configured, skipping live DB query");
        return;
      }

      const res = (await executeTool("query_notices", {
        guildId: "A",
        topicKey: "cvat",
      })) as QueryNoticesOutput;
      expect(res.status).toBe("answered");
    });

    it("dispatches evaluate_radar", async () => {
      const res = (await executeTool("evaluate_radar", {
        guildId: "A",
        now: "2026-09-18T12:00:00Z",
      })) as EvaluateRadarOutput;
      expect(res.items).toBeDefined();
      expect(res.metrics).toBeDefined();
    });

    it("dispatches create_staff_alert", async () => {
      const res = (await executeTool("create_staff_alert", {
        guildId: "A",
        questionId: "q-123",
        tier: 1,
        summary: "Soft warning alert",
      })) as StaffAlert;
      expect(res.id).toBeDefined();
      expect(res.tier).toBe(1);
    });

    it("dispatches resolve_question", async () => {
      const res = (await executeTool("resolve_question", {
        questionId: "q-dispatch-test",
        expectedVersion: 0,
        actorRole: "lab_coach",
      })) as ResolveQuestionOutput;
      expect(res.success).toBe(true);
      expect(res.newVersion).toBe(1);
    });

    it("dispatches format_daily_digest", async () => {
      const res = (await executeTool("format_daily_digest", {
        guildId: "A",
        localDate: "2026-09-18",
      })) as DailyDigestOutput;
      expect(res.title).toContain("2026-09-18");
      expect(res.rankedTopics.length).toBeGreaterThan(0);
    });

    it("dispatches search_web", async () => {
      const res = (await executeTool("search_web", {
        query: "VinUni",
      })) as SearchWebOutput;
      expect(res.results).toBeDefined();
    });

    it("throws error on unknown tool name", async () => {
      await expect(executeTool("unknown_tool", {})).rejects.toThrow(
        "Unknown tool: unknown_tool",
      );
    });
  });
});
