import Link from "next/link";
import { notFound } from "next/navigation";
import { notices } from "@/backend/fixtures";
export default async function SourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = notices.find((n) => n.id === id);
  if (!notice) notFound();
  return (
    <main className="standalone">
      <Link href="/">Back to workspace</Link>
      <h1>{notice.source.label}</h1>
      <p className="pill">Synthetic teaching example</p>
      <blockquote>{notice.answer}</blockquote>
      <p>
        Published{" "}
        {new Date(notice.publishedAt).toLocaleString("en-GB", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}{" "}
        (Vietnam).
      </p>
      <p className="muted">
        This is a fixture for testing notice selection. It is not an actual
        course announcement or a recovered Discord message.
      </p>
    </main>
  );
}
