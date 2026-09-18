import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock @/backend/database/client
vi.mock("@/backend/database/client", () => {
  return {
    configured: vi.fn(() => true),
    sessionClient: vi.fn(),
  };
});

import { POST } from "../app/api/workspace/reply/route";
import { configured, sessionClient } from "../app/backend/database/client";

describe("In-App Direct DB Reply Endpoint (/api/workspace/reply)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(configured).mockReturnValue(true);
  });

  it("returns 401 Unauthorized when session is missing", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("No session"),
        }),
      },
    };
    vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

    const req = new Request("http://localhost:3000/api/workspace/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "msg-123",
        content: "Here is the guidance.",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 400 Bad Request when payload is empty or invalid", async () => {
    const mockUser = { id: "u-coach-123" };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };
    vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

    const req = new Request("http://localhost:3000/api/workspace/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "",
        content: "",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid reply payload");
  });

  it("returns 403 Forbidden when a learner attempts to submit staff replies", async () => {
    const mockUser = { id: "u-student-learner" };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "guilds") {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: "c0000000-0000-0000-0000-000000000001" }],
              }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: "learner" }, // Learner, NOT coach!
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

    const req = new Request("http://localhost:3000/api/workspace/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "msg-123",
        content: "I am a learner pretending to be staff.",
        guildId: "c0000000-0000-0000-0000-000000000001",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Only authorized Lab Coaches");
  });

  it("successfully persists in-app reply to database and transitions question to answered", async () => {
    const mockCoach = { id: "u-labcoach-hai" };
    const mockInsertMessage = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateQuestion = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockInsertEvent = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockCoach },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "guilds") {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: "c0000000-0000-0000-0000-000000000001" }],
              }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: "lab_coach" }, // Authorized Coach!
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "source_messages") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "msg-original-question",
                    channel_id: "ch-lab-support",
                    dataset_id: "ds-k4",
                    record_ordinal: 42,
                  },
                  error: null,
                }),
              }),
            }),
            insert: mockInsertMessage,
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "q-101",
                    version: 1,
                  },
                  error: null,
                }),
              }),
            }),
            update: mockUpdateQuestion,
          };
        }
        if (table === "question_events") {
          return {
            insert: mockInsertEvent,
          };
        }
        return {};
      }),
    };
    vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

    const req = new Request("http://localhost:3000/api/workspace/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "msg-original-question",
        content:
          "Đối với file parquet 4GB, bạn hãy dùng chunking thay vì load toàn bộ nhé.",
        guildId: "c0000000-0000-0000-0000-000000000001",
        markAnswered: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("answered");
    expect(body.messageId).toBe("msg-original-question");
    expect(body.replyId).toBeDefined();

    // Verify database writes:
    // 1. Inserted into source_messages
    expect(mockInsertMessage).toHaveBeenCalledTimes(1);
    const insertedMsg = mockInsertMessage.mock.calls[0][0];
    expect(insertedMsg.reply_to_id).toBe("msg-original-question");
    expect(insertedMsg.message_type).toBe("reply");
    expect(insertedMsg.content).toContain("chunking");

    // 2. Updated questions table version and status
    expect(mockUpdateQuestion).toHaveBeenCalledWith({
      status: "answered",
      version: 2,
    });

    // 3. Logged audit event in question_events
    expect(mockInsertEvent).toHaveBeenCalledTimes(1);
    const insertedEvent = mockInsertEvent.mock.calls[0][0];
    expect(insertedEvent.event_type).toBe("replied");
    expect(insertedEvent.actor_id).toBe("u-labcoach-hai");
  });
});
