# ADR 0002: Deterministic Grounded RAG and Timestamp Resolution

We decided to enforce zero-tolerance hallucination policy on all course logistics inquiries by coupling Grounded RAG with deterministic Timestamp Resolution.

In high-intensity bootcamps, organizers frequently reschedule submission dates or issue grace periods across multiple announcements. Rather than allowing generative LLMs to blend differing dates or invent deadlines, the retrieval engine filters only verified announcements posted by instructors/TAs, chronologically resolves conflicts to the latest announcement timestamp, and formats an exact jump link. If confidence is below 0.70 or no official record exists, the system executes a graceful fallback ("Chưa có thông tin chính thức") and escalates to human TAs, guaranteeing zero student misinformation.
