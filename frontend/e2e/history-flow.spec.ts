import { test, expect } from '@playwright/test'

const uniqueEmail = () => `e2e-history-${Date.now()}@example.com`

test.describe('History sidebar end-to-end behavior', () => {
  test('bookmark toggle updates the UI when history is loaded', async ({ page }) => {
    let bookmarked = false
    let historyItems = [
      {
        id: 1,
        user_id: 1,
        natural_question: 'History item 1',
        generated_sql: 'SELECT 1',
        execution_result: null,
        error_message: null,
        is_bookmarked: bookmarked,
        created_at: new Date().toISOString(),
      },
    ]

    const email = uniqueEmail()

    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email,
          full_name: 'History User',
          is_active: true,
          created_at: new Date().toISOString(),
        }),
      })
    })

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'e2e-token', token_type: 'bearer' }),
      })
    })

    await page.route('**/api/query/schema', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tables: [] }),
      })
    })

    await page.route('**/api/history/?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(historyItems),
      })
    })

    await page.route('**/api/history/1/bookmark', async (route) => {
      bookmarked = !bookmarked
      historyItems[0].is_bookmarked = bookmarked
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bookmarked }),
      })
    })

    await page.goto('/register')
    await page.getByPlaceholder('Full Name').fill('History User')
    await page.getByPlaceholder('Email address').fill(email)
    await page.getByPlaceholder('Password').fill('E2ETestPass1')
    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByPlaceholder('Email address').fill(email)
    await page.getByPlaceholder('Password').fill('E2ETestPass1')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await expect(page.getByText('History item 1')).toBeVisible({ timeout: 15000 })

    const star = page.locator('button').filter({ hasText: '★' }).first()
    await star.click()
    await expect(star).toHaveClass(/text-yellow-500/)
  })
})
