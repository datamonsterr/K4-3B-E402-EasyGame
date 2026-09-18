import type { Actor, ActorId, GuildId } from "../assistant/logistics/contracts";

export type MembershipRecord = {
  userId: string;
  guildId: string;
  role: "learner" | "lab_coach";
};

export interface AuthMembershipSource {
  getAuthenticatedUserId(): Promise<string | null>;
  listMemberships(userId: string): Promise<readonly MembershipRecord[]>;
}

export type ActorContextResult =
  | { type: "unauthenticated" }
  | { type: "forbidden" }
  | { type: "ready"; actor: Actor };

export async function resolveActorContext(
  source: AuthMembershipSource,
): Promise<ActorContextResult> {
  const userId = await source.getAuthenticatedUserId();
  if (!userId) return { type: "unauthenticated" };

  const memberships = await source.listMemberships(userId);
  if (memberships.length !== 1) return { type: "forbidden" };

  const membership = memberships[0];
  if (
    membership.userId !== userId ||
    (membership.role !== "learner" && membership.role !== "lab_coach")
  ) {
    return { type: "forbidden" };
  }

  return {
    type: "ready",
    actor: {
      userId: userId as ActorId,
      guildId: membership.guildId as GuildId,
      role: membership.role,
    },
  };
}
