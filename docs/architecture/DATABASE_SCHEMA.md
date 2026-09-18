# EasyGame database schema

Status: implemented foundation, 2026-09-18. Engine: Supabase PostgreSQL 17. Scope: dataset-first relational contracts that support—but do not complete—UC-B1-01 and UC-B2-01.

## Relationships

```text
datasets ──< source_messages >── guilds ──< channels
                 │                         │
                 ├── optional parent       │
                 └──> authors              │
                 │                         │
                 ├──< notices              │
                 └── question ──< question_events
                          └──< radar_alerts
guilds ──< memberships >── auth.users
guilds ──< digests
guilds ──< assistant_runs ──< run_events
```

Source authors are pseudonymous people/bots from the pack. Authenticated app accounts are distinct identities. No implicit mapping between them is available or permitted. A display name or an author label does not grant a role.

## Table definitions

Every table has a primary key and `created_at timestamptz not null default now()`. UUIDs identify application records. Discord snowflakes, if introduced later, remain strings to avoid JavaScript precision loss. Foreign-key deletion defaults to RESTRICT; an explicit dataset purge transaction deletes dependent data in order. Retention rules require a separate product decision before live personal data is collected.

| Table | Fields and constraints beyond primary key / created_at |
| --- | --- |
| `datasets` | `id uuid`; `sha256 text unique not null` with 64 lowercase hex check; `name text`; `source_kind` restricted to pack/synthetic/live; `row_count integer >= 0`; `imported_at timestamptz`; checksum identifies the exact immutable file |
| `guilds` | `id uuid`; `source_namespace text`; `source_label text`; unique namespace/label; `timezone text` default Asia/Ho_Chi_Minh |
| `channels` | `id uuid`; `guild_id uuid FK`; `source_label text`; nullable `display_name`; `visibility` unknown/public/staff default unknown; unique guild/label; unique guild/id for composite child references |
| `authors` | `id uuid`; `source_namespace text`; `source_label text`; `is_bot boolean`; unique namespace/label; no inferred staff role |
| `source_messages` | `id uuid`; `dataset_id uuid FK`; `record_ordinal integer > 0`; `guild_id uuid FK`; `channel_id uuid`; `author_id uuid FK`; `source_label text`; `message_type` message/reply; `sent_at timestamptz`; `content text`; `mentions_bot boolean`; `attachment_count integer >= 0`; `source_char_count integer >= 0`; nullable `reply_source_label`; nullable `reply_to_id uuid`; `reply_resolution` none/resolved/missing/ambiguous; nullable `discord_jump_url`; unique dataset/record_ordinal; composite FK guild/channel; composite FK dataset/guild/reply_to; unique dataset/guild/id supports parent reference |
| `memberships` | primary key `(guild_id,user_id)`; FKs guilds/auth.users; `role` learner/lab_coach; controlled by privileged provisioning, not self-editable user metadata |
| `notices` | `id uuid`; `guild_id uuid`; `message_id uuid`; `topic_key text`; `verified_by uuid`; `verified_at timestamptz`; `published_at timestamptz`; `answer_excerpt text` trimmed length 1–300 characters; composite FK guild/message; verifier must be an authorized coach at write time; unique message/topic; only explicitly reviewed evidence enters this table |
| `questions` | `id uuid`; `guild_id uuid`; `message_id uuid unique`; `intent text`; `status` open/claimed/answered/resolved; nullable `claimed_by uuid`; nullable `resolved_at timestamptz`; `version integer >= 0`; composite FK guild/message; claim references a guild member and validates coach capability in transaction; resolved timestamp iff resolved |
| `question_events` | `id uuid`; `guild_id uuid`; `question_id uuid`; `event_type` detected/claimed/replied/resolved/reopened; nullable `actor_id uuid`; `occurred_at timestamptz`; `idempotency_key text unique`; brief `summary text`; composite FK guild/question; no raw private reasoning |
| `radar_alerts` | `id uuid`; `guild_id uuid`; `question_id uuid`; `tier integer` in 1/2; `status` pending/sent/failed; `attempts integer >= 0`; nullable `sent_at timestamptz`; unique question/tier; composite FK guild/question |
| `digests` | `id uuid`; `guild_id uuid FK`; `local_date date`; `status` pending/sent/failed; `summary text`; nullable `sent_at timestamptz`; unique guild/local_date |
| `assistant_runs` | `id uuid`; `guild_id uuid FK`; `actor_id uuid FK`; `status` answered/clarify/fallback/error; `artifact_version text`; `latency_ms integer >= 0`; nullable `confidence numeric` within [0,1]; `decision_summary text`; nullable `notice_id uuid` scoped to same guild |
| `run_events` | `id uuid`; `run_id uuid FK`; `sequence integer >= 0`; `event_type` retrieval/tool/result/error; `summary text`; `safe_metadata jsonb` default {}; unique run/sequence; allowlisted metadata only |

Composite uniqueness `(guild_id,id)` is also required on messages, questions and notices wherever a composite foreign key uses it. Nullable foreign keys are intentional for absent evidence; never insert a fake referenced row to satisfy a constraint. Unknown channel visibility denies access until a trusted curator configures it.

`source_char_count` preserves the CSV value for auditing; it is not a trusted application length limit. Use Unicode-aware text checks on responses. `discord_jump_url` remains null for the pack. Local source references resolve by the internal message UUID, with dataset/record ordinal shown in the source viewer. Live jump URLs must match numeric Discord guild/channel/message IDs; labels such as M59723 are not snowflakes.

## Import contract

1. Parse CSV with a real CSV parser supporting quoted commas, embedded newlines and UTF-8. Validate headers, exact booleans, integers, enum values and nonempty labels.
2. Compute file SHA-256. Parsed data-record ordinal starts at one; it is not a physical line number.
3. Parse the source timestamp as Asia/Ho_Chi_Minh (UTC+07:00). Store UTC `timestamptz`; reject invalid calendar dates and never use the machine's local timezone.
4. Create dataset/guild/channel/author rows and all messages in one transactional import. Re-importing the same checksum is idempotent. A different file creates a new immutable dataset version; do not merge by source label.
5. Resolve `reply_to` within the same dataset and guild only when exactly one row matches. Preserve missing/ambiguous source labels with null internal target. A non-null target requires `reply_resolution = resolved`; a missing target cannot be marked resolved.
6. Return aggregate import counts and issues. Log no source message bodies. The inspected input must yield 1,092 messages, 501 resolved references, five missing, two ambiguous and 584 absent references.
7. Never auto-create authoritative notices, learner identities or resolved questions from the masked pack. Question detection may produce candidates with explicit uncertainty for review.

Deterministic UUIDs derived from checksum/ordinal are an option; the uniqueness constraint is required regardless of UUID generation. Transactional conflict handling must make concurrent imports safe.

## Index and query plan

| Access pattern | Index or deliberate scan |
| --- | --- |
| Import retry / deduplication | datasets SHA-256 unique; messages `(dataset_id,record_ordinal)` unique |
| Reply lookup | messages `(dataset_id,guild_id,source_label)` nonunique |
| Channel feed, keyset paginated | messages `(guild_id,channel_id,sent_at DESC,id)` |
| Replies and author history | messages `reply_to_id` partial non-null; `author_id` |
| Latest verified notice for a topic | notices `(guild_id,topic_key,published_at DESC,id)`; tied conflicting timestamps require clarification |
| Open radar queue | questions `(guild_id,status,created_at,id)` partial where status <> resolved; join source message time for elapsed SLA |
| Actor authorization | memberships `(user_id,guild_id)` plus composite primary key |
| Event replay and audit | question_events `(question_id,occurred_at,id)`; run_events `(run_id,sequence)` unique |
| Pending notification retry | radar_alerts `(status,created_at)` partial where status <> sent |
| Daily digest lookup | digests `(guild_id,local_date)` unique |
| Runs by actor | assistant_runs `(actor_id,created_at DESC)` and guild index |

Index other referencing FK columns not covered by a leading index prefix. At 1,092 messages a source audit scan is acceptable; do not add vector embeddings before a retrieval evaluation demonstrates a need. Topic, state, timestamps and identity stay typed columns; JSONB is only for optional sanitized event metadata.

## Authorization and transactional writes

Enable RLS on every exposed table and explicitly grant only intended operations. The `anon` database role has no table privileges and no access to the private helper schema; anonymous visitors see synthetic demo content only through the application. Authenticated members can read messages only from their guild's explicitly public channels. Coaches can read their own guild's staff channels, unknown source channels and radar. Membership checks avoid recursive RLS; every security-definer helper has an empty search path, schema-qualified names, minimum grants and no caller-controlled user identity. Default function privileges are revoked until an additive migration grants a specific role access to a specific function.

Learners cannot modify memberships, verify notices, claim others' tickets, send alerts or view other learners' runs. A user can read their own assistant runs; a coach can read runs within their guild where the product authorizes it. Event access inherits the parent run policy. Dataset metadata and source-author lookup must not open an indirect cross-guild disclosure path.

Use the authenticated user's Supabase client for ordinary requests so RLS remains effective. Server secret/service-role clients are only for imports, provisioning and authenticated scheduler jobs. Verify authorization before any privileged client use; RLS does not protect calls using a bypass key.

Claim/resolve transitions occur in one database transaction with an expected version. Two coaches racing to claim cannot both succeed. A reply changes status to answered; only confirmed resolution stops SLA tracking. Staff provenance or original-learner confirmation must be checked against authenticated evidence, which the pack cannot supply automatically. No client-supplied role is trusted.

Notification uniqueness prevents duplicate outbox entries, but does not alone ensure exactly-once delivery to Discord: a remote send may succeed before the database acknowledgement. Future live delivery needs a recorded remote message identifier and reconciliation. No external notifications are enabled in the dataset foundation.

## Migration and validation

The project has no existing database to backfill. Migration `20260918000000_foundation.sql` creates the schema, constraints, indexes and policies together. Forward migration `20260918041852_harden_foundation_access.sql` removes anonymous Data API privileges, narrows private helper execution, locks future function defaults and validates the Grounded Response excerpt limit. A synthetic seed exercises multiple guilds and roles. The restricted CSV is imported only by an explicit local command and remains excluded from git and build artifacts.

Test migration application on a clean local database; apply the real RLS policies using anonymous, learner, coach and privileged roles. Test self-promotion denial, cross-guild references, private-channel access, concurrent claims, duplicate imports, ambiguous replies and invalid timestamps. Test policy behavior, not merely the presence of the phrase `enable row level security` in SQL.

Before a hosted migration, inspect its diff and use an environment-scoped deployment workflow. Prefer additive changes and forward fixes; retain database backup/restore guidance. A failed application rollout can revert its deployment only while database changes remain backward compatible. Do not advertise database rollback by deleting migrations.

## Use-case coverage

The schema enforces provenance, verified notice authority, guild isolation, staff-only radar access, answered-versus-resolved state, SLA outbox uniqueness, explicit resolution and concurrent claim safety. It does not perform semantic intent routing, live Discord collection or delivery, rate-limit recovery, digest summarization, Unicode sanitization or original-Learner resolution confirmation.

See [the use-case quality and foundation coverage review](../usecases/IMPLEMENTATION_COVERAGE.md) for the 20-point validation and requirement-by-requirement implementation status. These gaps are explicit future behavior, not database features to simulate with untrusted pack labels.
