export function GET() {
  return Response.json({
    status: "ok",
    application: "easygame",
    mode: "dataset-first",
  });
}
