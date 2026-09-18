import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/backend/database/schema.types";

/**
 * Returns a browser-scoped Supabase client when public credentials are configured,
 * or null when running in preview/synthetic/offline mode.
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createBrowserClient<Database>(url, key);
}
