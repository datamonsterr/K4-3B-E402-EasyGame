# ADR 0003: Tiered SLA Radar and Non-Intrusive Staff Escalation

We decided to implement a two-tiered SLA monitoring radar (Tier 1 Soft Warning at 2 hours, Tier 2 Urgent Escalation at 4 hours) restricted entirely to the internal staff channel `#ta-radar`.

Survey findings and stakeholder feedback revealed that unsolicited bot DMs to students feel invasive, while public reminder pings create channel noise. Restricting radar alerts to `#ta-radar` allows on-duty TAs to view prioritized cards with direct deep links without disturbing learners. The system automatically evicts items from the radar as soon as an instructor responds or a student marks the thread with `:white_check_mark:`. Furthermore, the 22:00 Daily Digest applies syllable-boundary sanitization to completely eliminate legacy token corruption bugs (e.g. `"nguồn tham chiếu"`).
