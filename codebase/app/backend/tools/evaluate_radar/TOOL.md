---
name: evaluate_radar
track: core
kind: local_status
requires_env: []
inputs: [questions, now]
outputs: [id, status, elapsedMinutes, tier]
side_effect: false
---

# Evaluate radar

Evaluates authorized questions against an explicit clock. Tier 1 begins at 120 minutes and Tier 2 at 240 minutes. Answered questions remain tracked until resolved. This tool does not deliver notifications or mutate data.
