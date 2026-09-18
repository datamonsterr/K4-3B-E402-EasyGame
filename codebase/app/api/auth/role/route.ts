import { createRoleHandler } from "./handler";
import { sessionClient, configured } from "@/backend/database/client";

const handler = createRoleHandler({
  async getAuthenticatedUserId() {
    const client = await sessionClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    return error || !user ? null : user.id;
  },
});

export async function POST() {
  if (!configured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    return await handler();
  } catch {
    return Response.json(
      { error: "Authentication unavailable" },
      { status: 503 },
    );
  }
}
