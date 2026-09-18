import { z } from "zod";

const roleSchema = z.object({
  role: z.enum(["learner", "lab_coach"]),
  guildId: z.string().optional(),
});

export type RoleHandlerDependencies = {
  getAuthenticatedUserId(): Promise<string | null>;
  writeMembership?: (...args: never[]) => unknown;
  checkExistingMembership?: (
    userId: string,
    guildId: string,
  ) => Promise<{ role: string } | null>;
  upsertMembership?: (
    userId: string,
    guildId: string,
    role: string,
  ) => Promise<void>;
  getDefaultGuildId?: () => Promise<string | null>;
};

export function createRoleHandler(deps: RoleHandlerDependencies) {
  return async function POST(request?: Request): Promise<Response> {
    const userId = await deps.getAuthenticatedUserId();
    if (!userId) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    if (deps.writeMembership) {
      return Response.json(
        {
          error:
            "Guild memberships and roles are provisioned by trusted operators",
        },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    if (!request) {
      return Response.json(
        { error: "Invalid role specified" },
        { status: 400, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    let raw: string;
    try {
      raw = await request.text();
    } catch {
      return Response.json(
        { error: "Invalid request body" },
        { status: 400, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: "Invalid role specified" },
        { status: 400, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const input = roleSchema.safeParse(parsed);
    if (!input.success) {
      return Response.json(
        { error: "Invalid role specified" },
        { status: 400, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    let targetGuildId = input.data.guildId;
    if (!targetGuildId && deps.getDefaultGuildId) {
      targetGuildId = (await deps.getDefaultGuildId()) ?? undefined;
    }

    if (!targetGuildId) {
      return Response.json(
        { error: "No cohort guild available" },
        { status: 404, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    if (deps.checkExistingMembership) {
      const existing = await deps.checkExistingMembership(
        userId,
        targetGuildId,
      );
      if (existing && existing.role) {
        return Response.json(
          {
            error:
              "Role is permanently locked after onboarding and cannot be changed",
          },
          { status: 403, headers: { "Cache-Control": "private, no-store" } },
        );
      }
    }

    if (deps.upsertMembership) {
      await deps.upsertMembership(userId, targetGuildId, input.data.role);
    }

    return Response.json(
      {
        ok: true,
        role: input.data.role,
        guildId: targetGuildId,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  };
}
