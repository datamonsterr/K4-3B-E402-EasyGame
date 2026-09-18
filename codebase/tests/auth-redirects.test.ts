import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock database client
vi.mock("@/backend/database/client", () => ({
  configured: vi.fn(() => true),
  sessionClient: vi.fn(),
}));

import SignInPage from "../app/sign-in/page";
import WorkspacePage from "../app/workspace/page";
import { configured, sessionClient } from "@/backend/database/client";

describe("Authentication Redirect & Loop Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(configured).mockReturnValue(true);
  });

  describe("SignInPage (app/sign-in/page)", () => {
    it("does NOT redirect to /workspace when error parameter is present in searchParams", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1", email: "test@example.com" } },
            error: null,
          }),
        },
      };
      vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

      // User arrives with error=membership_required
      const res = await SignInPage({
        searchParams: Promise.resolve({ error: "membership_required" }),
      });

      // Must render SignInCard JSX rather than throwing Next.js redirect to /workspace
      expect(res).toBeDefined();
    });

    it("does NOT redirect to /workspace when user has no provisioned membership", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: "user-unprovisioned", email: "test@example.com" },
            },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [], // No memberships
                  error: null,
                }),
              }),
            }),
          }),
        })),
      };
      vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

      const res = await SignInPage({
        searchParams: Promise.resolve({}),
      });

      // Must render sign-in form, NOT redirect to /workspace
      expect(res).toBeDefined();
    });
  });

  describe("WorkspacePage (app/workspace/page)", () => {
    it("renders Onboarding in WorkspaceShell instead of infinite redirect when user has 0 memberships", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-new-student",
                email: "new@example.com",
                user_metadata: { full_name: "New Student" },
              },
            },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [], // No memberships yet -> Needs Onboarding
                  error: null,
                }),
              }),
            }),
          }),
        })),
      };
      vi.mocked(sessionClient).mockResolvedValue(mockSupabase as never);

      const pageElement = await WorkspacePage();
      expect(pageElement).toBeDefined();
      expect(pageElement.props.initialNeedsOnboarding).toBe(true);
    });
  });
});
