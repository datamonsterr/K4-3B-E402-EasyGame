import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../app/backend/database/schema.types";
import { createSupabaseAgentOperations } from "../app/backend/assistant/agent/operations";
import { ToolOperationError } from "../app/backend/assistant/agent/operation-errors";
import { createSupabaseNoticeEvidence } from "../app/backend/assistant/logistics/supabase-evidence";
import { fetchQuestionsFromDb } from "../app/backend/tools/evaluate_radar/tool";

type QueryResponse = { data: unknown; error: unknown };

function clientWithResponses(
  responses: Record<string, QueryResponse>,
  filters: Array<[string, string, unknown]> = [],
  rpcCalls: Array<[string, unknown]> = [],
): SupabaseClient<Database> {
  return {
    from(table: string) {
      const response = responses[table] ?? { data: [], error: null };
      const query = {
        select() {
          return query;
        },
        insert() {
          return query;
        },
        eq(column: string, value: unknown) {
          filters.push([table, column, value]);
          return query;
        },
        gte(column: string, value: unknown) {
          filters.push([table, `${column}>=`, value]);
          return query;
        },
        lt(column: string, value: unknown) {
          filters.push([table, `${column}<`, value]);
          return query;
        },
        order() {
          return query;
        },
        single() {
          return Promise.resolve(response);
        },
        maybeSingle() {
          return Promise.resolve(response);
        },
        then<TResult1 = QueryResponse, TResult2 = never>(
          onfulfilled?:
            ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?:
            ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(response).then(onfulfilled, onrejected);
        },
      };
      return query;
    },
    rpc(name: string, args?: unknown) {
      rpcCalls.push([name, args]);
      return Promise.resolve(
        responses[`rpc:${name}`] ?? { data: null, error: null },
      );
    },
  } as unknown as SupabaseClient<Database>;
}

describe("hosted agent operation boundaries", () => {
  it("distinguishes a successful empty radar read from a database failure", async () => {
    const emptyClient = clientWithResponses({
      questions: { data: [], error: null },
    });
    await expect(fetchQuestionsFromDb(emptyClient, "guild-a")).resolves.toEqual(
      [],
    );

    const failedClient = clientWithResponses({
      questions: {
        data: null,
        error: { message: "SUPABASE_SECRET_KEY=do-not-leak" },
      },
    });
    const failure = await fetchQuestionsFromDb(failedClient, "guild-a").catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ToolOperationError);
    expect(failure).toMatchObject({
      kind: "unavailable",
      operation: "evaluate_radar",
      message: "evaluate_radar failed",
    });
    expect(JSON.stringify(failure)).not.toContain("SUPABASE_SECRET_KEY");
  });

  it("applies the authenticated guild filter in Supabase and preserves state/version", async () => {
    const filters: Array<[string, string, unknown]> = [];
    const rpcCalls: Array<[string, unknown]> = [];
    const client = clientWithResponses(
      {
        "rpc:list_radar_items": {
          data: [
            {
              question_id: "question-1",
              status: "answered",
              version: 7,
              tier: 2,
            },
          ],
          error: null,
        },
      },
      filters,
      rpcCalls,
    );

    const operations = createSupabaseAgentOperations(
      client,
      () => new Date("2026-09-18T12:00:00.000Z"),
    );
    const result = await operations.evaluateRadar({ guildId: "guild-a" });

    expect(filters).not.toContainEqual(["questions", "guild_id", "guild-a"]);
    expect(rpcCalls).toContainEqual(["list_radar_items", undefined]);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "question-1",
        status: "answered",
        version: 7,
        tier: 2,
      }),
    ]);
  });

  it("derives the daily digest from guild-scoped Supabase rows", async () => {
    const filters: Array<[string, string, unknown]> = [];
    const client = clientWithResponses(
      {
        questions: {
          data: [
            {
              status: "resolved",
              intent: "lab-1",
              created_at: "2026-09-18T03:00:00.000Z",
            },
            {
              status: "open",
              intent: "lab-1",
              created_at: "2026-09-18T04:00:00.000Z",
            },
            {
              status: "answered",
              intent: "cvat",
              created_at: "2026-09-18T05:00:00.000Z",
            },
          ],
          error: null,
        },
      },
      filters,
    );
    const operations = createSupabaseAgentOperations(
      client,
      () => new Date("2026-09-18T15:00:00.000Z"),
    );

    const digest = await operations.formatDailyDigest({
      guildId: "guild-a",
      actorId: "coach-a",
      actorRole: "lab_coach",
      localDate: "2026-09-18",
    });

    expect(filters).toContainEqual(["questions", "guild_id", "guild-a"]);
    expect(digest.metrics).toEqual({ total: 3, resolved: 1, backlog: 2 });
    expect(digest.rankedTopics).toEqual([
      { rank: 1, topic: "lab-1", count: 2 },
      { rank: 2, topic: "cvat", count: 1 },
    ]);
    expect(digest.sanitizedSummary).toContain("1/3");
    expect(digest.sanitizedSummary).not.toContain("28/33");
  });

  it("does not expose fabricated broadcast, profile, or score operations", () => {
    const operations = createSupabaseAgentOperations(clientWithResponses({}));

    expect("broadcastNotification" in operations).toBe(false);
    expect("checkStudentProfile" in operations).toBe(false);
    expect("checkScores" in operations).toBe(false);
  });

  it("returns empty notice evidence but fails closed with a sanitized error", async () => {
    const emptyEvidence = createSupabaseNoticeEvidence(
      clientWithResponses({ notices: { data: [], error: null } }),
    );
    await expect(
      emptyEvidence.findVerifiedNotices({
        guildId: "guild-a" as never,
        topicKey: "lab-1",
      }),
    ).resolves.toEqual([]);

    const failedEvidence = createSupabaseNoticeEvidence(
      clientWithResponses({
        notices: {
          data: null,
          error: { message: "postgres://secret-password@host/database" },
        },
      }),
    );
    const failure = await failedEvidence
      .findVerifiedNotices({
        guildId: "guild-a" as never,
        topicKey: "lab-1",
      })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({
      kind: "unavailable",
      operation: "query_notices",
      message: "query_notices failed",
    });
    expect(JSON.stringify(failure)).not.toContain("secret-password");
  });
});
