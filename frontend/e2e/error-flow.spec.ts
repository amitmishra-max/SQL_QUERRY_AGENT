import { test, expect } from '@playwright/test'

const uniqueEmail = () => `e2e-error-${Date.now()}@example.com`

test.describe('Error handling flows', () => {
  test('invalid login shows error message', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Incorrect email or password' }),
      })
    })

    await page.goto('/login')
    await page.getByPlaceholder('Email address').fill('wrong@example.com')
    await page.getByPlaceholder('Password').fill('BadPass')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Incorrect email or password')).toBeVisible()
  })

  test('expired session redirects to login when askQuestion returns 401', async ({ page }) => {
    const email = uniqueEmail()
    const password = 'E2ETestPass1'

    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: email,
          full_name: 'Error User',
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

    await page.route('**/api/history/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/query/ask', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not authenticated' }),
      })
    })

    await page.goto('/register')
    await page.getByPlaceholder('Full Name').fill('Error User')
    await page.getByPlaceholder('Email address').fill(email)
    await page.getByPlaceholder('Password').fill(password)
    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByPlaceholder('Email address').fill(email)
    await page.getByPlaceholder('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByPlaceholder(/Ask a question/).fill('Show employees')
    await page.getByRole('button', { name: 'Ask' }).click()

    await expect(page.getByText(/Session expired/).first()).toBeVisible({ timeout: 15000 })
  })
})
