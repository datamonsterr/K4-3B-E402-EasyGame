import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadAndValidateTestsets } from "./lib/schema-validation.ts";

const validationRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function main(): Promise<void> {
  const inventory = await loadAndValidateTestsets(validationRoot);
  process.stdout.write(
    `Validated ${inventory.suites.length} suites / ${inventory.totalCases} cases\n`,
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Validation failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
