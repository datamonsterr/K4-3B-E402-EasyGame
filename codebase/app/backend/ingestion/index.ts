import { createHash, randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { z } from "zod";
const headers = [
  "msg_id",
  "guild",
  "channel",
  "author",
  "is_bot",
  "msg_type",
  "created_at_vn",
  "reply_to",
  "mentions_bot",
  "n_attachments",
  "n_chars",
  "content",
];
const count = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));
const bool = z.enum(["True", "False"]).transform((value) => value === "True");
const rowSchema = z.object({
  msg_id: z.string().min(1),
  guild: z.string().min(1),
  channel: z.string().min(1),
  author: z.string().min(1),
  is_bot: bool,
  msg_type: z.enum(["message", "reply"]),
  created_at_vn: z.string(),
  reply_to: z.string(),
  mentions_bot: bool,
  n_attachments: count,
  n_chars: count,
  content: z.string(),
});
export type ReferenceState = "none" | "resolved" | "missing" | "ambiguous";
export type PackRecord = {
  record_ordinal: number;
  source_label: string;
  guild_label: string;
  channel_label: string;
  author_label: string;
  is_bot: boolean;
  message_type: "message" | "reply";
  sent_at: string;
  content: string;
  mentions_bot: boolean;
  attachment_count: number;
  source_char_count: number;
  reply_source_label: string | null;
  reply_resolution: ReferenceState;
  reply_to_ordinal: number | null;
};
export type ParsedPack = {
  sha256: string;
  records: PackRecord[];
  report: { rows: number; references: Record<ReferenceState, number> };
};
function vietnamTimestamp(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    throw new Error("Expected Vietnamese timestamp YYYY-MM-DD HH:mm");
  const date = new Date(value.replace(" ", "T") + ":00+07:00");
  if (
    !Number.isFinite(date.getTime()) ||
    new Date(date.getTime() + 7 * 3600000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ") !== value
  )
    throw new Error("Invalid calendar timestamp");
  return date.toISOString();
}
export function parsePack(source: string): ParsedPack {
  const raw: unknown[] = parse(source, {
    bom: true,
    skip_empty_lines: true,
    columns: (columns: string[]) => {
      if (columns.join(",") !== headers.join(","))
        throw new Error("Unexpected CSV headers");
      return columns;
    },
  });
  if (!raw.length) throw new Error("Pack contains no records");
  const records: PackRecord[] = raw.map((row, index) => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) throw new Error(`Invalid CSV record ${index + 1}`);
    const r = parsed.data;
    return {
      record_ordinal: index + 1,
      source_label: r.msg_id,
      guild_label: r.guild,
      channel_label: r.channel,
      author_label: r.author,
      is_bot: r.is_bot,
      message_type: r.msg_type,
      sent_at: vietnamTimestamp(r.created_at_vn),
      content: r.content,
      mentions_bot: r.mentions_bot,
      attachment_count: r.n_attachments,
      source_char_count: r.n_chars,
      reply_source_label: r.reply_to || null,
      reply_resolution: "none",
      reply_to_ordinal: null,
    };
  });
  const lookup = new Map<string, number[]>();
  const key = (guild: string, label: string) => JSON.stringify([guild, label]);
  for (const r of records) {
    const k = key(r.guild_label, r.source_label);
    lookup.set(k, [...(lookup.get(k) ?? []), r.record_ordinal]);
  }
  const references: Record<ReferenceState, number> = {
    none: 0,
    resolved: 0,
    missing: 0,
    ambiguous: 0,
  };
  for (const r of records) {
    if (r.reply_source_label) {
      const matches =
        lookup.get(key(r.guild_label, r.reply_source_label)) ?? [];
      r.reply_resolution =
        matches.length === 1
          ? "resolved"
          : matches.length
            ? "ambiguous"
            : "missing";
      r.reply_to_ordinal = matches.length === 1 ? matches[0] : null;
    }
    references[r.reply_resolution]++;
  }
  return {
    sha256: createHash("sha256").update(source).digest("hex"),
    records,
    report: { rows: records.length, references },
  };
}
export type ImportResult = {
  dataset_id: string;
  already_imported: boolean;
  row_count: number;
};
export interface PackStore {
  write(pack: ParsedPack, name: string): Promise<ImportResult>;
}
export async function importPack(
  source: string,
  name: string,
  store: PackStore,
): Promise<ImportResult> {
  return store.write(parsePack(source), name);
}
export class MemoryPackStore implements PackStore {
  private readonly datasets = new Map<
    string,
    { id: string; records: PackRecord[] }
  >();
  async write(pack: ParsedPack): Promise<ImportResult> {
    const previous = this.datasets.get(pack.sha256);
    if (previous)
      return {
        dataset_id: previous.id,
        already_imported: true,
        row_count: previous.records.length,
      };
    const id = randomUUID();
    this.datasets.set(pack.sha256, {
      id,
      records: structuredClone(pack.records),
    });
    return {
      dataset_id: id,
      already_imported: false,
      row_count: pack.records.length,
    };
  }
}
