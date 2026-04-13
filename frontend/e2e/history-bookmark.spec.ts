import { test, expect } from "@playwright/test";

const uniqueEmail = () => `e2e-hist-${Date.now()}@example.com`;

test.describe("History sidebar + bookmark (mocked APIs)", () => {
  test("toggle bookmark star updates via mocked API", async ({ page }) => {
    const email = uniqueEmail();
    const password = "E2ETestPass1";

    let bookmarkOn = false;

    await page.route(
      (url) => url.port === "8000" && url.pathname.startsWith("/api/history"),
      async (route) => {
        const urlStr = route.request().url();
        const method = route.request().method();

        if (method === "GET" && /\/api\/history\/?(\?|$)/.test(urlStr)) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: 42,
                user_id: 1,
                natural_question: "E2E history item",
                generated_sql: "SELECT 1",
                execution_result: null,
                error_message: null,
                is_bookmarked: bookmarkOn,
                created_at: new Date().toISOString(),
              },
            ]),
          });
          return;
        }

        if (method === "POST" && urlStr.includes("/bookmark")) {
          bookmarkOn = !bookmarkOn;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ bookmarked: bookmarkOn }),
          });
          return;
        }

        await route.continue();
      },
    );

    await page.goto("/register");
    await page.getByPlaceholder("Full Name").fill("History User");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByText("E2E history item")).toBeVisible({ timeout: 15_000 });

    const star = page.locator("button").filter({ hasText: "★" }).first();
    await star.click();

    await expect(star).toHaveClass(/text-yellow-500/);
  });
});
