import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("canonical runner enters through production HTTP and never imports agent internals", async () => {
  const source = await readFile(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../scripts/run-agent-eval.ts",
    ),
    "utf8",
  );
  assert.match(source, /\/api\/demo\/answer/);
  assert.match(source, /loginHostedIdentity/);
  assert.doesNotMatch(source, /createCourseAgent|runAgent|backend\/assistant/);
});

test("runner derives evidence gates and snapshots database state", async () => {
  const source = await readFile(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../scripts/run-agent-eval.ts",
    ),
    "utf8",
  );
  assert.match(source, /assertDedicatedGuildsClean/);
  assert.match(source, /snapshotDatabase/);
  assert.match(source, /databaseDeltas/);
  assert.doesNotMatch(source, /production_api:\s*true/);
  assert.doesNotMatch(source, /hosted_supabase:\s*true/);
  assert.doesNotMatch(source, /authenticated:\s*true/);
  assert.doesNotMatch(source, /safe_trace:\s*true/);
});
