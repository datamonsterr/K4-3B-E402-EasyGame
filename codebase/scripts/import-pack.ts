import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parsePack, importPack } from "../app/backend/ingestion";
import { SupabasePackStore } from "../app/backend/database/pack-store";
const args = process.argv.slice(2);
const write = args.includes("--write");
const file = args.find((a) => !a.startsWith("--"));
if (!file)
  throw new Error(
    "Usage: npm run data:inspect -- /path/to/pack.csv; add --write only for an authorized import",
  );
const source = await readFile(resolve(file), "utf8");
const parsed = parsePack(source);
console.log(
  JSON.stringify({ sha256: parsed.sha256, ...parsed.report }, null, 2),
);
if (write) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the process environment",
    );
  const target = new URL(url);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) &&
    !args.includes("--allow-remote")
  )
    throw new Error(
      "Remote import requires --allow-remote; confirm dataset sharing permission first",
    );
  console.log(
    JSON.stringify(
      await importPack(source, basename(file), new SupabasePackStore(url, key)),
      null,
      2,
    ),
  );
}
