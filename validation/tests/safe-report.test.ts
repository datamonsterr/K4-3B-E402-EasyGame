import assert from "node:assert/strict";
import test from "node:test";
import { validateRun } from "../scripts/lib/schema-validation.ts";

test("rejects secret canaries inside otherwise allowlisted report strings", () => {
  assert.throws(
    () => validateRun({ telemetry: "Bearer secret-token" }),
    /unsafe/i,
  );
  assert.throws(
    () => validateRun({ telemetry: "rawProviderResponse body" }),
    /unsafe/i,
  );
});
