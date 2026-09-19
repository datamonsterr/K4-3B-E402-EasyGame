# Legacy partial baseline

`legacy-2026-09-18-partial.json` is a sanitized record of the historical evaluator, not proof that the production agent works end to end.

The record retains only two aggregate facts: an offline master result reported 24/24, and a Gemini-attempt logistics result reported 8/8. It also retains the matching prompt and tool hashes. It intentionally excludes prompts, queries, answers, tool inputs or outputs, identities, credentials, provider payloads, and private reasoning.

The baseline is classified `partial`. It did not establish the production API path, authenticated identity, consistent hosted Supabase provenance, write read-back, row-level-security enforcement, absence of fallback, or safe cleanup. Its reported accuracy must therefore never appear as a valid headline or predecessor for a hosted result.

The JSON is retained in its historical `1.0` compatibility envelope. It is not a canonical schema-valid hosted run and must not be rewritten to imply evidence that was never collected.
