# Synthetic hosted-validation fixtures

This catalog contains symbolic records that the privileged validation controller may materialize in the allowlisted hosted Supabase validation guilds. It contains no hosted identifiers, authentication material, restricted message-pack content, or real identities.

Every mutable row is marked `run_owned: true` and carries a `${run_id}` provenance template. Setup replaces symbolic aliases with IDs returned by Supabase. Cleanup may delete only rows whose stored provenance matches the active run ID; the assistant receives neither privileged credentials nor direct database access and must use its authenticated allowlisted tools.
