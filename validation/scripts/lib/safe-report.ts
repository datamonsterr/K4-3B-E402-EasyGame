import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvaluationRun } from "./contracts.ts";
import { validateRun } from "./schema-validation.ts";

export async function writeSafeReport(
  validationRoot: string,
  relativePath: string,
  report: EvaluationRun,
): Promise<string> {
  const target = path.resolve(validationRoot, relativePath);
  const relative = path.relative(validationRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Report path must stay inside validation");
  validateRun(report);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (
    /bearer\s|eyJ[a-zA-Z0-9_-]+\.|password|api[_-]?key|access[_-]?token|set-cookie|chain.?of.?thought|raw.?provider/i.test(
      serialized,
    )
  )
    throw new Error("Unsafe report content");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, serialized, { encoding: "utf8", flag: "wx" });
  return target;
}
