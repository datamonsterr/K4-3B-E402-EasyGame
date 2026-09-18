export type Membership = { role: "learner" | "lab_coach" };
export async function requireActor(
  userId: string | null,
  guildId: string,
  capability: "read" | "coach",
  lookup: (userId: string, guildId: string) => Promise<Membership | null>,
) {
  if (!userId) throw new Error("Unauthenticated");
  const membership = await lookup(userId, guildId);
  if (
    !membership ||
    (capability === "coach" && membership.role !== "lab_coach")
  )
    throw new Error("Forbidden");
  return { userId, guildId, role: membership.role };
}
