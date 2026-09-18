import { test, expect } from "@playwright/test";
test("root page redirects to /sign-in and renders clean auth UI with no logo", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/.*\/sign-in/);
  await expect(page.getByText("EasyGame")).toBeVisible();
  await expect(page.getByText("Track B")).toBeVisible();
  // Ensure strictly NO graphic logo
  expect(await page.locator("img[alt*='logo' i]").count()).toBe(0);
  // Ensure SSO options and a non-privileged synthetic preview exist.
  await expect(page.getByRole("button", { name: /Discord/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /synthetic preview/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/operator-provisioned course membership/i),
  ).toBeVisible();
});

test("full flow: demo sign-in, workspace navigation, grounded agent answering, and radar triage", async ({
  page,
}) => {
  await page.goto("/sign-in");
  // Open the synthetic learner-only preview when Supabase is not configured.
  await page.getByRole("button", { name: /synthetic preview/i }).click();
  await expect(page).toHaveURL(/.*\/workspace/);

  // In workspace: verify role is displayed statically (no sidebar select switcher per ADR 0001)
  await expect(
    page.locator("aside").getByText("@SyntheticPreview"),
  ).toBeVisible();
  await expect(page.locator("aside").getByText("Role: Learner")).toBeVisible();
  expect(await page.locator("select[name='persona-role']").count()).toBe(0);

  // Test Chat View: initial welcome message without fabricated source links or grounded badges
  await expect(page.getByText(/trợ lý hậu cần EasyGame/i)).toBeVisible();
  expect(
    await page.locator("a[href*='discord.com/channels/1234567890']").count(),
  ).toBe(0);
  expect(await page.getByText("100% Grounded").count()).toBe(0);

  // Test Navigation to Tickets & Radar View (B2)
  await page.getByRole("button", { name: /Tickets & Radar/i }).click();
  await expect(page.getByText(/Urgent Breaches/i)).toBeVisible();
  await expect(page.getByText(/SLA Breach Monitoring/i)).toBeVisible();

  // Test Navigation to Official Notices View
  await page.getByRole("button", { name: /Official Notices/i }).click();
  await expect(page.getByText(/Lab 1 Submission/i)).toBeVisible();

  // Test Navigation to Messages View
  await page.getByRole("button", { name: /Messages/i }).click();
  await expect(page.getByText(/Messages & Triage/i)).toBeVisible();

  // Test Navigation to 22:00 Daily Digest View
  await page.getByRole("button", { name: /22:00 Daily Digest/i }).click();
  await expect(page.getByText(/Clean Daily Digest/i)).toBeVisible();

  // Test Navigation to Feedback View
  await page.getByRole("button", { name: /Feedback/i }).click();
  await expect(page.getByRole("link", { name: /Google Forms/i })).toBeVisible();
});
test("routes reject invalid input and require configured auth", async ({
  request,
}) => {
  expect((await request.get("/api/health")).status()).toBe(200);
  expect(
    (
      await request.post("/api/demo/answer", { data: { topicKey: 123 } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/demo/answer", {
        data: { query: "When is Lab 1 due?", apiKey: "hack" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/demo/answer", {
        data: { query: "When is Lab 1 due?" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/demo/answer", {
        data: "broken",
        headers: { "content-type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/api/workspace?guild=not-a-uuid")).status()).toBe(
    400,
  );
  expect(
    (
      await request.post("/api/auth/login", {
        data: { email: "x", password: "" },
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/api/jobs/radar")).status()).toBe(401);
});
test("static mock is preserved and has no inline JavaScript syntax errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/mock/index.html");
  await expect(page).toHaveTitle(/EasyGame/);
  expect(errors).toEqual([]);
});
test("mobile layout stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
