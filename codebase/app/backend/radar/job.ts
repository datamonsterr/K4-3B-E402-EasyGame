import "server-only";
import { authorizedJob } from "../auth/http";
import { jobClient } from "../database/client";
export async function runJob(
  request: Request,
  name: "enqueue_radar" | "enqueue_digests",
) {
  if (!authorizedJob(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, error } = await jobClient().rpc(name);
    if (error) return Response.json({ error: "Job failed" }, { status: 502 });
    return Response.json({ queued: data, delivery: "disabled" });
  } catch {
    return Response.json(
      { error: "Job database unavailable" },
      { status: 503 },
    );
  }
}
