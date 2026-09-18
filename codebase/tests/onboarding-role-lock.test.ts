import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock @/backend/database/client
vi.mock("@/backend/database/client", () => {
  return {
    configured: vi.fn(() => true),
    sessionClient: vi.fn(),
  };
});

import { POST } from "../app/api/auth/role/route";
import { configured, sessionClient } from "../app/backend/database/client";

describe("Onboarding & Role Immutability Security Gate (/api/auth/role)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(configured).mockReturnValue(true);
  });

  it("returns 401 Unauthorized when user session is missing", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("No session"),
        }),
      },
    };
    vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

    const req = new Request("http://localhost:3000/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "learner" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 Bad Request when role is invalid", async () => {
    const req = new Request("http://localhost:3000/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin_superpower" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid role specified");
  });

  it("allows initial role provisioning during first sign-in onboarding", async () => {
    const mockUser = { id: "u-first-time-student-123" };
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

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
                data: [{ id: "guild-e402" }],
              }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            // Check for existing membership
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // No existing membership
                    error: null,
                  }),
                }),
              }),
            }),
            upsert: mockUpsert,
          };
        }
        return {};
      }),
    };
    vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

    const req = new Request("http://localhost:3000/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "learner", guildId: "guild-e402" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.role).toBe("learner");
    expect(body.guildId).toBe("guild-e402");
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        guild_id: "guild-e402",
        user_id: "u-first-time-student-123",
        role: "learner",
      },
      { onConflict: "guild_id,user_id" },
    );
  });

  it("strictly rejects post-onboarding role mutation with 403 Forbidden", async () => {
    const mockUser = { id: "u-already-provisioned-learner" };
    const mockUpsert = vi.fn();

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
                data: [{ id: "guild-e402" }],
              }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            // Check for existing membership: already has a role
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: "learner" }, // Existing locked role!
                    error: null,
                  }),
                }),
              }),
            }),
            upsert: mockUpsert,
          };
        }
        return {};
      }),
    };
    vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

    // Learner attempts self-promotion to lab_coach post-onboarding
    const req = new Request("http://localhost:3000/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "lab_coach", guildId: "guild-e402" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Role is permanently locked after onboarding");
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
