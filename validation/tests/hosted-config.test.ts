import assert from "node:assert/strict";
import test from "node:test";
import {
  HOSTED_ACKNOWLEDGEMENT,
  loadHostedConfig,
} from "../scripts/lib/hosted-config.ts";

const env = () => ({
  EASYGAME_HOSTED_VALIDATION_ACK: HOSTED_ACKNOWLEDGEMENT,
  VALIDATION_APP_URL: "https://easygame.example",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
  SUPABASE_SECRET_KEY: "server-secret",
  VALIDATION_GUILD_ALLOWLIST:
    "11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222",
  VALIDATION_LEARNER_A_EMAIL: "learner-a@example.invalid",
  VALIDATION_LEARNER_A_PASSWORD: "one",
  VALIDATION_COACH_A_EMAIL: "coach-a@example.invalid",
  VALIDATION_COACH_A_PASSWORD: "two",
  VALIDATION_LEARNER_B_EMAIL: "learner-b@example.invalid",
  VALIDATION_LEARNER_B_PASSWORD: "three",
  VALIDATION_COACH_B_EMAIL: "coach-b@example.invalid",
  VALIDATION_COACH_B_PASSWORD: "four",
});

test("loads an explicitly acknowledged hosted-only configuration", () => {
  const config = loadHostedConfig(env());
  assert.equal(config.guildIds.length, 2);
  assert.equal(config.identities.coach_b.role, "lab_coach");
});

test("rejects missing acknowledgement and local origins", () => {
  assert.throws(
    () => loadHostedConfig({ ...env(), EASYGAME_HOSTED_VALIDATION_ACK: "" }),
    /acknowledgement/i,
  );
  assert.throws(
    () =>
      loadHostedConfig({
        ...env(),
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    /hosted HTTPS/i,
  );
});

test("rejects incomplete identities and malformed allowlists without printing values", () => {
  assert.throws(
    () => loadHostedConfig({ ...env(), VALIDATION_COACH_B_PASSWORD: "" }),
    /VALIDATION_COACH_B_PASSWORD/,
  );
  assert.throws(
    () =>
      loadHostedConfig({ ...env(), VALIDATION_GUILD_ALLOWLIST: "not-a-uuid" }),
    /exactly two/i,
  );
});
