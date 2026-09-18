import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PackStore, ParsedPack, ImportResult } from "../ingestion";
const resultSchema = z.object({
  dataset_id: z.uuid(),
  already_imported: z.boolean(),
  row_count: z.number().int().nonnegative(),
});
export class SupabasePackStore implements PackStore {
  private client;
  constructor(url: string, secretKey: string) {
    this.client = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  async write(pack: ParsedPack, name: string): Promise<ImportResult> {
    const { data, error } = await this.client.rpc("import_pack", {
      p_sha256: pack.sha256,
      p_name: name,
      p_records: pack.records,
    });
    if (error) throw new Error(`Import failed (${error.code})`);
    return resultSchema.parse(data);
  }
}
