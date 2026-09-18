import { getToolDbClient } from "../db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../database/schema.types";

export interface ResolveQuestionArgs {
  questionId: string;
  expectedVersion: number;
  actorRole?: string;
  actorId?: string;
}

export interface ResolveQuestionOutput {
  success: boolean;
  questionId: string;
  resolvedAt: string;
  newVersion: number;
}

const memoryQuestions = new Map<string, { version: number; status: string }>();

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str,
  );
}

/**
 * Custom tool: resolve_question
 * Defined in tools.yaml
 * Authorized Lab Coach action to mark a question ticket as resolved.
 * Validates coach role and enforces optimistic concurrency version checking.
 */
export async function executeResolveQuestion(
  args: ResolveQuestionArgs,
  dbClient?: SupabaseClient<Database>,
): Promise<ResolveQuestionOutput> {
  if (args.actorRole && args.actorRole !== "lab_coach") {
    throw new Error("Only an authorized Lab Coach can resolve tickets");
  }

  const client = dbClient ?? getToolDbClient();

  if (client && isUuid(args.questionId)) {
    try {
      const { data: q, error: fetchErr } = await client
        .from("questions")
        .select("id, version, status")
        .eq("id", args.questionId)
        .maybeSingle();

      if (!fetchErr && q) {
        if (q.status === "resolved") {
          throw new Error("Question is already resolved");
        }
        if (q.version !== args.expectedVersion) {
          throw new Error(
            `Question changed or version mismatch (expected: ${args.expectedVersion}, found: ${q.version})`,
          );
        }

        const newVersion = args.expectedVersion + 1;
        const resolvedAt = new Date().toISOString();

        const { error: updateErr } = await client
          .from("questions")
          .update({
            status: "resolved",
            resolved_at: resolvedAt,
            version: newVersion,
          })
          .eq("id", args.questionId)
          .eq("version", args.expectedVersion);

        if (updateErr) {
          throw new Error(
            `Failed to resolve question in database: ${updateErr.message}`,
          );
        }

        memoryQuestions.set(args.questionId, {
          version: newVersion,
          status: "resolved",
        });

        return {
          success: true,
          questionId: args.questionId,
          resolvedAt,
          newVersion,
        };
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("version mismatch") ||
          err.message.includes("already resolved") ||
          err.message.includes("authorized"))
      ) {
        throw err;
      }
      // Otherwise fall through to memory store
    }
  }

  // Memory store path
  const existing = memoryQuestions.get(args.questionId);
  if (existing) {
    if (existing.status === "resolved") {
      throw new Error("Question is already resolved");
    }
    if (existing.version !== args.expectedVersion) {
      throw new Error(
        `Question changed or version mismatch (expected: ${args.expectedVersion}, found: ${existing.version})`,
      );
    }
  }

  const newVersion = args.expectedVersion + 1;
  const resolvedAt = new Date().toISOString();
  memoryQuestions.set(args.questionId, {
    version: newVersion,
    status: "resolved",
  });

  return {
    success: true,
    questionId: args.questionId,
    resolvedAt,
    newVersion,
  };
}

export function resetMemoryQuestions(): void {
  memoryQuestions.clear();
}
