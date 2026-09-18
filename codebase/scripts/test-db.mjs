import { spawn, spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

const root = fileURLToPath(new URL("../supabase/", import.meta.url));
const name = `easygame-db-test-${process.pid}-${Date.now()}`;
function docker(args, options = {}) {
  const result = spawnSync("docker", args, { encoding: "utf8", ...options });
  if (result.status !== 0)
    throw new Error(result.stderr || result.stdout || String(result.error));
  return result.stdout;
}
function sql(text, database = "postgres") {
  return docker(
    [
      "exec",
      "-i",
      name,
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-X",
    ],
    { input: text },
  );
}
try {
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "-e",
    "POSTGRES_PASSWORD=synthetic-test-only",
    ...(process.argv.includes("--types") ? ["-p", "127.0.0.1::5432"] : []),
    "postgres:17-alpine",
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (
      spawnSync(
        "docker",
        ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        { stdio: "ignore" },
      ).status === 0
    ) {
      ready = true;
      break;
    }
    await setTimeout(500);
  }
  if (!ready) throw new Error("Dedicated test PostgreSQL did not become ready");
  sql(readFileSync(`${root}/tests/bootstrap.sql`, "utf8"));
  for (const file of readdirSync(`${root}/migrations`)
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    sql(readFileSync(`${root}/migrations/${file}`, "utf8"));
    console.log(`Applied ${file}`);
  }
  for (const file of readdirSync(`${root}/tests`)
    .filter((file) => file.endsWith(".test.sql"))
    .sort()) {
    sql(readFileSync(`${root}/tests/${file}`, "utf8"));
    console.log(`Passed ${file}`);
  }
  // Real concurrent sessions: only one claimant and one initial importer may win.
  sql(`insert into public.questions(id,guild_id,message_id,intent)
    select '10000000-0000-0000-0000-000000000002',guild_id,id,'concurrency'
    from public.source_messages where record_ordinal=2;`);
  function concurrentSql(statement) {
    return new Promise((resolve, reject) => {
      const child = spawn("docker", [
        "exec",
        "-i",
        name,
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-v",
        "VERBOSITY=verbose",
        "-X",
        "-tA",
      ]);
      let output = "";
      let error = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk) => {
        error += chunk;
      });
      child.on("error", reject);
      child.on("close", (status) => resolve({ status, output, error }));
      child.stdin.end(statement);
    });
  }
  const claims = await Promise.all(
    [2, 3].map((actor) =>
      concurrentSql(`
    begin;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000${actor}',true);
    set local role authenticated;
    select public.claim_question('10000000-0000-0000-0000-000000000002',0);
    select pg_sleep(0.2);
    commit;`),
    ),
  );
  if (
    claims.filter((r) => r.status === 0).length !== 1 ||
    claims.filter((r) => r.status !== 0 && r.error.includes("40001")).length !==
      1
  ) {
    throw new Error(`Concurrent claims failed: ${JSON.stringify(claims)}`);
  }
  sql(
    `select test.assert((select count(*)=1 from public.question_events where question_id='10000000-0000-0000-0000-000000000002'), 'racing claim emits one event');`,
  );
  const imports = await Promise.all(
    [1, 2].map(() =>
      concurrentSql(`
    begin; set local role service_role;
    select public.import_pack(repeat('d',64),'concurrent-synthetic','[]')->>'already_imported';
    select pg_sleep(0.2); commit;`),
    ),
  );
  if (
    imports.some((r) => r.status !== 0) ||
    imports.filter((r) => r.output.includes("false")).length !== 1 ||
    imports.filter((r) => r.output.includes("true")).length !== 1
  ) {
    throw new Error(`Concurrent imports failed: ${JSON.stringify(imports)}`);
  }
  console.log("Passed real concurrent claim and import transactions");
  sql("create database seed_validation");
  sql(
    readFileSync(`${root}/tests/bootstrap.sql`, "utf8")
      .split("\n")
      .filter((line) => !line.startsWith("create role "))
      .join("\n"),
    "seed_validation",
  );
  for (const file of readdirSync(`${root}/migrations`)
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    sql(readFileSync(`${root}/migrations/${file}`, "utf8"), "seed_validation");
  }
  sql(readFileSync(`${root}/seed.sql`, "utf8"), "seed_validation");
  sql(
    `select test.assert((select count(*)=7 from public.source_messages), 'synthetic seed messages');
    select test.assert((select count(*)=4 from public.memberships), 'synthetic seed roles');
    select test.assert((select source_kind='synthetic' from public.datasets), 'seed provenance');`,
    "seed_validation",
  );
  console.log("Passed clean synthetic seed application");
  const packIndex = process.argv.indexOf("--pack");
  if (packIndex !== -1) {
    const path = process.argv[packIndex + 1];
    if (!path) throw new Error("--pack requires an explicit local CSV path");
    const { parsePack } = await import("../src/backend/ingestion/index.ts");
    const pack = parsePack(readFileSync(path, "utf8"));
    const literal = (value) => "'" + value.replaceAll("'", "''") + "'";
    try {
      // Data travels only over stdin to the isolated container; no repository copy.
      sql(
        `set role service_role; select public.import_pack('${pack.sha256}','restricted-local-validation',${literal(JSON.stringify(pack.records))}::jsonb);`,
      );
      sql(`set role service_role;
        select test.assert((public.import_pack('${pack.sha256}','retry','[]')->>'already_imported')::boolean, 'actual pack import idempotent');
        select test.assert((select count(*)=${pack.records.length} from public.source_messages m join public.datasets d on d.id=m.dataset_id where d.sha256='${pack.sha256}'), 'every actual pack row preserved');`);
      for (const [state, count] of Object.entries(pack.report.references)) {
        sql(
          `select test.assert((select count(*)=${count} from public.source_messages m join public.datasets d on d.id=m.dataset_id where d.sha256='${pack.sha256}' and m.reply_resolution='${state}'), 'actual pack reference totals match');`,
        );
      }
    } catch {
      throw new Error(
        "Restricted pack database validation failed; source content was withheld from logs",
      );
    }
    console.log(
      `Passed restricted local pack import: ${JSON.stringify(pack.report)}; duplicate import idempotent`,
    );
  }
  if (process.argv.includes("--types")) {
    const port = docker(["port", name, "5432/tcp"]).trim().split(":").at(-1);
    const cli = fileURLToPath(
      new URL("../node_modules/.bin/supabase", import.meta.url),
    );
    const generated = spawnSync(
      cli,
      [
        "gen",
        "types",
        "typescript",
        "--db-url",
        `postgresql://postgres:synthetic-test-only@127.0.0.1:${port}/postgres`,
        "--schema",
        "public",
      ],
      { encoding: "utf8" },
    );
    if (generated.status !== 0)
      throw new Error(generated.stderr || "Supabase type generation failed");
    writeFileSync(
      new URL("../src/backend/database/schema.types.ts", import.meta.url),
      generated.stdout,
    );
    console.log("Generated database schema types using Supabase CLI");
  }
} finally {
  spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
}
