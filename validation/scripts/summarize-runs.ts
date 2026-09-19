import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseLedger } from "./log-version.ts";

export type LedgerSummary = {
  validRunCount: number;
  excludedRunCount: number;
  headlines: Array<{
    suite: string;
    metric_name: string;
    metric_after: string;
    run_file: string;
  }>;
};

const invalidPrefix = /^(?:PARTIAL|INVALID|INCOMPLETE)_/u;

function suiteFromReason(reason: string): string {
  return /^suite=([^;]+);/u.exec(reason)?.[1] ?? "unknown";
}

export async function summarizeLedger(
  ledgerPath: string,
): Promise<LedgerSummary> {
  const rows = parseLedger(await readFile(ledgerPath, "utf8"));
  const validRows = rows.filter((row) => !invalidPrefix.test(row.metric_name));
  const latest = new Map<string, (typeof validRows)[number]>();
  for (const row of validRows) {
    latest.set(`${suiteFromReason(row.reason)}\0${row.metric_name}`, row);
  }
  return {
    validRunCount: validRows.length,
    excludedRunCount: rows.length - validRows.length,
    headlines: [...latest.values()].map((row) => ({
      suite: suiteFromReason(row.reason),
      metric_name: row.metric_name,
      metric_after: row.metric_after,
      run_file: row.run_file,
    })),
  };
}

async function main(): Promise<void> {
  const defaultLedger = fileURLToPath(
    new URL("../version_log.csv", import.meta.url),
  );
  const ledgerPath = path.resolve(process.argv[2] ?? defaultLedger);
  process.stdout.write(
    `${JSON.stringify(await summarizeLedger(ledgerPath), null, 2)}\n`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
    process.exitCode = 1;
  });
}
