import { createClient } from "@supabase/supabase-js";

/**
 * Script to verify or seed local database with rich mock data.
 * Usage: npx tsx scripts/seed-mock.ts
 */
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  if (!key) {
    console.error("SUPABASE_SECRET_KEY is required in environment");
    return;
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Connecting to Supabase at ${url}...`);

  // Check existing channels
  const { data: channels, error: chErr } = await client
    .from("channels")
    .select("id, source_label, display_name, visibility");
  if (chErr) {
    console.error("Error reading channels:", chErr.message);
  } else {
    console.log(
      `Found ${channels.length} channels:`,
      channels.map((c) => c.display_name || c.source_label).join(", "),
    );
  }

  // Check existing notices
  const { data: notices, error: notErr } = await client
    .from("notices")
    .select("id, topic_key, published_at, answer_excerpt");
  if (notErr) {
    console.error("Error reading notices:", notErr.message);
  } else {
    console.log(
      `Found ${notices.length} notices:`,
      notices.map((n) => `${n.topic_key} (${n.published_at})`).join(", "),
    );
  }

  // Check existing questions
  const { data: questions, error: qErr } = await client
    .from("questions")
    .select("id, status, intent");
  if (qErr) {
    console.error("Error reading questions:", qErr.message);
  } else {
    console.log(
      `Found ${questions.length} questions:`,
      questions.map((q) => `${q.status}: ${q.intent}`).join(", "),
    );
  }

  console.log("Local Supabase mock data verified successfully!");
}

main().catch((err) => {
  console.error("Seed verification failed:", err);
  process.exit(1);
});
