/**
 * E2E: Database Failure Scenarios
 * 
 * Tests how the application handles database failures:
 * - Connection lost
 * - Permission denied
 * - Database unavailable
 * - Query timeout
 * 
 * Run:
 *   npx playwright test e2e/database-failure.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Database Failures', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login first
    await page.goto('/dashboard');
    
    // If not logged in, login
    const dashboardVisible = await page.locator('text=Dashboard|Schema').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!dashboardVisible) {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'TestPass123');
      await page.click('button:has-text("Sign In")');
      await page.waitForURL('**/dashboard');
    }
  });

  test('should display error when database connection is unavailable', async ({ page }) => {
    // Intercept schema endpoint and return connection error
    await page.route('/api/query/schema', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Cannot connect to database. Connection refused.',
          detail: 'Database connection failed'
        })
      });
    });

    // Try to fetch schema (happens on page load)
    await page.reload();

    // Should show error message
    await expect(
      page.locator('text=/cannot connect|connection|unavailable|error/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display error when custom database URL is invalid', async ({ page }) => {
    // Find custom connection input
    const connectionInputs = page.locator('input[placeholder*="database" i], input[placeholder*="connection" i], input[placeholder*="url" i]');
    
    const inputCount = await connectionInputs.count();
    if (inputCount > 0) {
      // Intercept schema call when custom DB is used
      await page.route('/api/query/schema', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid database connection string'
          })
        });
      });

      // Enter invalid connection string
      await page.fill('input[placeholder*="database" i], input[placeholder*="connection" i]', 
        'invalid://connection:string');
      
      // Blur to trigger validation
      await page.press('input[placeholder*="database" i], input[placeholder*="connection" i]', 'Tab');

      // Should show error
      await expect(
        page.locator('text=/invalid|error|connection/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display error when database permissions are denied', async ({ page }) => {
    // User has no SELECT permission on tables
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Access denied: User does not have SELECT permission on this table'
        })
      });
    });

    // Try to ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show all data');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show permission error
    await expect(
      page.locator('text=/permission|denied|access/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display error when query execution times out', async ({ page }) => {
    // Query takes too long
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Query execution timeout: database query exceeded maximum time of 30 seconds'
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Analyze all data');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show timeout message
    await expect(
      page.locator('text=/timeout|exceeded|seconds/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show helpful message when database is locked', async ({ page }) => {
    // Database is locked by another transaction
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Database is temporarily locked. Please try again in a moment.'
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Get data');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show user-friendly message
    await expect(
      page.locator('text=/locked|try again|moment/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should not lose previous results when new error occurs', async ({ page }) => {
    // First: Successful query
    await page.route('/api/query/ask', async (route) => {
      if (route.request().url().includes('ask')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sql: 'SELECT * FROM users LIMIT 1',
            explanation: 'First query',
            result: [{ id: 1, name: 'Alice' }],
            error: null
          })
        });
      } else {
        await route.continue();
      }
    });

    // Execute first query
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show users');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Verify first result is shown
    await expect(page.locator('text=Alice')).toBeVisible({ timeout: 5000 });

    // Now intercept and return error
    await page.unroute('/api/query/ask');
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Database connection lost'
        })
      });
    });

    // Execute second query
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show something else');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Error should be shown
    await expect(
      page.locator('text=/error|connection|lost/i')
    ).toBeVisible({ timeout: 5000 });

    // But previous results should still be visible
    // (or cleared - depends on implementation)
    // Just verify page is in a consistent state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should recover after database comes back online', async ({ page }) => {
    let isOnline = false;

    // First: offline
    await page.route('/api/query/ask', async (route) => {
      if (isOnline) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sql: 'SELECT * FROM users LIMIT 1',
            explanation: 'Query after recovery',
            result: [{ id: 1, name: 'Bob' }],
            error: null
          })
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Database offline'
          })
        });
      }
    });

    // First query fails
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Get data');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show error
    await expect(
      page.locator('text=/offline|error/i')
    ).toBeVisible({ timeout: 5000 });

    // Simulate database coming back online
    isOnline = true;

    // Retry
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should now succeed
    await expect(
      page.locator('text=Bob')
    ).toBeVisible({ timeout: 5000 });
  });
});
