import { access, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = new URL("../../", import.meta.url);
const app = new URL("codebase/", root);
const read = (base, name) => readFile(new URL(name, base), "utf8");
const manifest = JSON.parse(
  await read(app, "app/backend/artifacts/reference/starter_v0/PROVENANCE.json"),
);
for (const [file, hash] of Object.entries(manifest.sha256)) {
  const bytes = await readFile(
    new URL(`app/backend/artifacts/reference/starter_v0/${file}`, app),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    hash,
    `Changed starter reference: ${file}`,
  );
}
assert.match(
  await read(root, ".agents/rules/easygame.md"),
  /@\.\.\/\.\.\/AGENTS\.md/,
);
assert.match(
  await read(root, ".gitignore"),
  /data\/discord-pack\/k4_messages\.csv/,
);
for (const file of await readdir(
  new URL("app/backend/artifacts/versions/v0/", app),
)) {
  assert.equal(
    await read(app, `app/backend/artifacts/versions/v0/${file}`),
    await read(app, `app/backend/artifacts/${file}`),
  );
}
for (const legacy of [
  "agent_tests/",
  "agent_test_runs/",
  "codebase/agent_test_runs/",
  "codebase/eval/",
  "codebase/scripts/run_agent_eval.ts",
  "validation/user_testing_log.md",
]) {
  await assert.rejects(
    access(new URL(legacy, root)),
    /ENOENT/,
    `Legacy validation path must be absent: ${legacy}`,
  );
}
for (const canonical of [
  "validation/README.md",
  "validation/OBSERVATION_LOG.md",
  "validation/version_log.csv",
  "validation/scripts/run-agent-eval.ts",
  "validation/testsets/manifest.json",
]) {
  await access(new URL(canonical, root));
}
const html = await read(root, "index.html");
await assert.rejects(
  access(new URL("index.html", app)),
  /ENOENT/,
  "codebase/index.html must not exist; the repository-root index.html is canonical",
);
for (const match of html.matchAll(
  /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
)) {
  new Function(match[1]);
}
console.log(
  `Verified ${Object.keys(manifest.sha256).length} starter references, artifact snapshot, shared rules and static script syntax`,
);
