import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function sessionClient() {
  if (!configured()) throw new Error("Supabase is not configured");
  try {
    const jar = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => jar.getAll(),
          setAll: (items) => {
            for (const { name, value, options } of items)
              jar.set(name, value, options);
          },
        },
      },
    );
  } catch {
    // Fallback for tests or executions outside Next.js request scope
    const memory = new Map<string, string>();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Supabase job credentials are not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
