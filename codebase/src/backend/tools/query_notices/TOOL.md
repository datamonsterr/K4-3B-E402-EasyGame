---
name: query_notices
track: core
kind: local_knowledge
requires_env: []
inputs: [guildId, topicKey, confidence, evidence]
outputs: [status, text, source, summary]
side_effect: false
---

# Query notices

Calls the assistant module interface. Only pass evidence already authorized for the actor's guild. Never accept client-supplied authority/confidence as trusted facts. Returns an answer, clarification or fallback; missing evidence is never invented. The demo endpoint passes only fixed synthetic fixtures.
