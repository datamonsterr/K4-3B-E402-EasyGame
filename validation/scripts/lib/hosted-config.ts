export const HOSTED_ACKNOWLEDGEMENT =
  "I_UNDERSTAND_SYNTHETIC_HOSTED_WRITES" as const;

export type IdentityAlias = "learner_a" | "coach_a" | "learner_b" | "coach_b";
export type HostedIdentity = {
  email: string;
  password: string;
  guildId: string;
  role: "learner" | "lab_coach";
};
export type HostedConfig = {
  appUrl: string;
  supabaseUrl: string;
  publishableKey: string;
  secretKey: string;
  guildIds: readonly [string, string];
  identities: Record<IdentityAlias, HostedIdentity>;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value)
    throw new Error(`Missing required hosted validation setting: ${name}`);
  return value;
}

function hostedHttps(value: string, name: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)
  ) {
    throw new Error(`${name} must be a hosted HTTPS origin`);
  }
  return url.origin;
}

export function loadHostedConfig(
  env: NodeJS.ProcessEnv = process.env,
): HostedConfig {
  if (env.EASYGAME_HOSTED_VALIDATION_ACK !== HOSTED_ACKNOWLEDGEMENT) {
    throw new Error("Hosted validation acknowledgement is required");
  }
  const guildIds = required(env, "VALIDATION_GUILD_ALLOWLIST")
    .split(",")
    .map((value) => value.trim());
  if (
    guildIds.length !== 2 ||
    new Set(guildIds).size !== 2 ||
    guildIds.some((id) => !UUID.test(id))
  ) {
    throw new Error(
      "VALIDATION_GUILD_ALLOWLIST must contain exactly two distinct UUIDs",
    );
  }
  const role = (alias: IdentityAlias) =>
    alias.startsWith("coach") ? ("lab_coach" as const) : ("learner" as const);
  const guild = (alias: IdentityAlias) =>
    alias.endsWith("_a") ? guildIds[0]! : guildIds[1]!;
  const identities = Object.fromEntries(
    (["learner_a", "coach_a", "learner_b", "coach_b"] as const).map((alias) => {
      const prefix = `VALIDATION_${alias.toUpperCase()}`;
      return [
        alias,
        {
          email: required(env, `${prefix}_EMAIL`),
          password: required(env, `${prefix}_PASSWORD`),
          guildId: guild(alias),
          role: role(alias),
        },
      ];
    }),
  ) as Record<IdentityAlias, HostedIdentity>;
  return {
    appUrl: hostedHttps(
      required(env, "VALIDATION_APP_URL"),
      "VALIDATION_APP_URL",
    ),
    supabaseUrl: hostedHttps(
      required(env, "NEXT_PUBLIC_SUPABASE_URL"),
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    publishableKey: required(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    secretKey: required(env, "SUPABASE_SECRET_KEY"),
    guildIds: guildIds as [string, string],
    identities,
  };
}
