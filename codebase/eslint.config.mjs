import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "public/mock/**",
    "src/backend/artifacts/reference/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);
