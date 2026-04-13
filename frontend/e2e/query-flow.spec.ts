import { test, expect } from '@playwright/test'

const uniqueEmail = () => `e2e-query-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`

test.describe('Dashboard query flow (mocked query backend)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/query/schema', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tables: [
            {
              table_name: 'employees',
              columns: [
                { column_name: 'id', data_type: 'int', is_nullable: 'NO', is_primary_key: true },
                { column_name: 'name', data_type: 'varchar', is_nullable: 'YES', is_primary_key: false },
              ],
              foreign_keys: [],
            },
          ],
        }),
      })
    })

    await page.route('**/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT id, name FROM employees',
          explanation: '<p>Returns all employees</p>',
          result: [{ id: 1, name: 'Alice' }],
          columns: ['id', 'name'],
          error: null,
        }),
      })
    })
  })

  test('asks a question and sees results in the dashboard', async ({ page }) => {
    const email = uniqueEmail()
    const password = 'E2ETestPass1'

    await page.goto('/register')
    await page.getByPlaceholder('Full Name').fill('Query User')
    await page.getByPlaceholder('Email address').fill(email)
    await page.getByPlaceholder('Password').fill(password)
    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByPlaceholder('Email address').fill(email)
    await page.getByPlaceholder('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await expect(page.getByText('Database Schema')).toBeVisible()

    await page.getByPlaceholder(/Ask a question/).fill('Show all employees')
    await page.getByRole('button', { name: 'Ask' }).click()

    await expect(page.getByText('Results (1 rows)')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible()
    await page.getByRole('button', { name: 'Explanation' }).click()
    await expect(page.getByText('Returns all employees')).toBeVisible()
  })
})
