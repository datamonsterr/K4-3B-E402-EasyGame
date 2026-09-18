export type RoleHandlerDependencies = {
  getAuthenticatedUserId(): Promise<string | null>;
  writeMembership?: (...args: never[]) => unknown;
};

export function createRoleHandler(deps: RoleHandlerDependencies) {
  return async function POST(_request?: Request): Promise<Response> {
    void _request;
    const userId = await deps.getAuthenticatedUserId();
    if (!userId) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return Response.json(
      {
        error:
          "Guild memberships and roles are provisioned by trusted operators",
      },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  };
}
