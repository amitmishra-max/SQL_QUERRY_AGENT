import { test, expect } from "@playwright/test";

const uniqueEmail = () => `e2e-dash-${Date.now()}@example.com`;

test.describe("Dashboard (mocked LLM + schema)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/query/schema", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tables: [
            {
              table_name: "employees",
              columns: [
                {
                  column_name: "id",
                  data_type: "int",
                  is_nullable: "NO",
                  is_primary_key: true,
                },
              ],
              foreign_keys: [],
            },
          ],
        }),
      });
    });

    await page.route("**/api/query/ask", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sql: "SELECT 1 AS n",
          explanation: "<p>E2E mock explanation</p>",
          result: [{ n: 1 }],
          columns: ["n"],
          error: null,
        }),
      });
    });
  });

  test("ask question shows results", async ({ page }) => {
    const email = uniqueEmail();
    const password = "E2ETestPass1";

    await page.goto("/register");
    await page.getByPlaceholder("Full Name").fill("Dash User");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByRole("heading", { name: /Database Schema/ })).toBeVisible();

    await page.getByPlaceholder(/Ask a question/).fill("How many rows?");
    await page.getByRole("button", { name: "Ask" }).click();

    await expect(page.getByText("Results (1 rows)")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2E mock explanation")).toBeVisible();
  });
});
