import { runJob } from "@/backend/radar/job";
export async function GET(request: Request) {
  return runJob(request, "enqueue_radar");
}
