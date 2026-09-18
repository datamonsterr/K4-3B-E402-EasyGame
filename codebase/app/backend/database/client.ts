import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
function getPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getPublicKey());
}

export async function sessionClient() {
  if (!configured()) throw new Error("Supabase is not configured");
  const publicKey = getPublicKey();
  try {
    const jar = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      publicKey,
      {
        cookies: {
          getAll: () => jar.getAll(),
          setAll: (items) => {
            try {
              for (const { name, value, options } of items)
                jar.set(name, value, options);
            } catch {
              // Ignore cookie mutations in Server Components where cookies are read-only
            }
          },
        },
      },
    );
  } catch {
    // Fallback for tests or executions outside Next.js request scope
    const memory = new Map<string, string>();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      publicKey,
      {
        cookies: {
          getAll: () =>
            Array.from(memory.entries()).map(([name, value]) => ({
              name,
              value,
            })),
          setAll: (items) => {
            for (const { name, value } of items) memory.set(name, value);
          },
        },
      },
    );
  }
}

export function jobClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase job credentials are not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
