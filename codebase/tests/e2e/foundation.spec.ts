import { test, expect } from "@playwright/test";
test("foundation renders, answers from synthetic evidence and links its source", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your cohort, in view." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check notice" }).click();
  await expect(
    page.getByText("Lab 1 is due at 12:00 on September 19, 2026.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Lab 1 extension (synthetic)" }).click();
  await expect(
    page.getByRole("heading", { name: "Lab 1 extension (synthetic)" }),
  ).toBeVisible();
});
test("unknown topics fall back without invented dates", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Milestone").selectOption("lab-3");
  await page.getByRole("button", { name: "Check notice" }).click();
  await expect(
    page.getByText(
      "There is no verified notice for this question. Please ask a Lab Coach for confirmation.",
    ),
  ).toBeVisible();
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
