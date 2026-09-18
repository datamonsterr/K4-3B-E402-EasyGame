import { getToolDbClient } from "../db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../database/schema.types";

export interface CreateStaffAlertArgs {
  guildId: string;
  questionId: string;
  tier: 1 | 2;
  summary: string;
}

export interface StaffAlert {
  id: string;
  guildId: string;
  questionId: string;
  tier: 1 | 2;
  summary: string;
  createdAt: string;
}

const memoryAlerts: StaffAlert[] = [];

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str,
  );
}

/**
 * Custom tool: create_staff_alert
 * Defined in tools.yaml
 * Queues a staff-only alert into radar_alerts table in Supabase or memory store
 * without unsolicited DMs or public pings.
 */
export async function executeCreateStaffAlert(
  args: CreateStaffAlertArgs,
  dbClient?: SupabaseClient<Database>,
): Promise<StaffAlert> {
  const client = dbClient ?? getToolDbClient();

  if (client) {
    try {
      if (isUuid(args.questionId)) {
        // Query question to verify existence and get exact guild_id
        const { data: q } = await client
          .from("questions")
          .select("id, guild_id")
          .eq("id", args.questionId)
          .maybeSingle();

        if (q) {
          const { data, error } = await client
            .from("radar_alerts")
            .insert({
              guild_id: q.guild_id,
              question_id: q.id,
              tier: args.tier,
              status: "pending",
            })
            .select()
            .single();

          if (!error && data) {
            const alert: StaffAlert = {
              id: data.id,
              guildId: args.guildId,
              questionId: args.questionId,
              tier: args.tier,
              summary: args.summary,
              createdAt: data.created_at,
            };
            memoryAlerts.push(alert);
            return alert;
          }
        }
      }
    } catch {
      // Fall through to memory store if DB insert fails
    }
  }

  const alert: StaffAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    guildId: args.guildId,
    questionId: args.questionId,
    tier: args.tier,
    summary: args.summary,
    createdAt: new Date().toISOString(),
  };
  memoryAlerts.push(alert);
  return alert;
}

export function getStaffAlerts(guildId?: string): readonly StaffAlert[] {
  return guildId
    ? memoryAlerts.filter((a) => a.guildId === guildId)
    : memoryAlerts;
}

export function clearStaffAlerts(): void {
  memoryAlerts.length = 0;
}
