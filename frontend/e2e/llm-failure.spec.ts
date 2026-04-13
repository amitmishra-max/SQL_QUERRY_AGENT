/**
 * E2E: LLM Service Failure Scenarios
 * 
 * Tests how the application handles LLM service failures:
 * - Service timeout
 * - Malformed response
 * - Service unavailable
 * - Empty response
 * 
 * Run:
 *   npx playwright test e2e/llm-failure.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Service Failures', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Register and login test user
    await page.goto('/');
    
    // Check if already logged in
    const loginButton = await page.locator('text=Sign In').isVisible();
    
    if (loginButton) {
      // Go to register page
      await page.click('text=Don\'t have an account');
      
      // Fill registration
      const timestamp = Date.now();
      const email = `llmtest_${timestamp}@example.com`;
      
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'TestPassword123');
      await page.fill('input[placeholder="Full Name"]', 'LLM Test User');
      
      // Submit registration
      await page.click('button:has-text("Sign Up")');
      
      // Wait for redirect to login
      await page.waitForURL('**/login');
      
      // Login
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'TestPassword123');
      await page.click('button:has-text("Sign In")');
      
      // Wait for dashboard
      await page.waitForURL('**/dashboard');
    }
  });

  test('should display timeout error when LLM service times out', async ({ page }) => {
    // Intercept ask request and delay it beyond timeout
    await page.route('/api/query/ask', async (route) => {
      // Simulate timeout (> 30 seconds)
      await new Promise(resolve => setTimeout(resolve, 31000));
      await route.continue();
    });

    // Fill in question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'What is the database schema?');
    
    // Submit
    await page.press('textarea, input', 'Enter');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show timeout error message
    await expect(page.locator('text=timeout|Timeout|timed out')).toBeVisible({ timeout: 35000 });
    
    // Error message should be readable
    const errorText = await page.locator('[role="alert"], .error, .error-message').textContent();
    expect(errorText).toBeTruthy();
  });

  test('should handle malformed LLM response', async ({ page }) => {
    // Intercept ask request and return invalid JSON
    await page.route('/api/query/ask', async (route) => {
      await route.abort();
      await route.fulfill({
        status: 200,
        body: 'This is not JSON at all! Just garbage text.',
        contentType: 'text/plain'
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show me the data');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show error
    await expect(page.locator('text=error|Error|failed')).toBeVisible({ timeout: 10000 });
  });

  test('should handle LLM returning non-SELECT query', async ({ page }) => {
    // Intercept and return UPDATE query (should be rejected)
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'UPDATE users SET name = "hacked"',
          explanation: 'Modified query',
          result: [],
          error: 'Only SELECT queries are allowed.'
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Change all user names');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show error about UPDATE
    const errorLocator = page.locator('text=/SELECT|allowed|forbidden/i');
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
  });

  test('should display user-friendly message for LLM service unavailable', async ({ page }) => {
    // Intercept and return 503 Service Unavailable
    await page.route('/api/query/ask', async (route) => {
      await route.abort();
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'LLM service is temporarily unavailable. Please try again later.'
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Get schema');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show service unavailable message
    await expect(page.locator('text=unavailable|service|temporarily')).toBeVisible({ timeout: 5000 });
  });

  test('should handle empty LLM response', async ({ page }) => {
    // Intercept and return empty response
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: '',
          explanation: '',
          error: 'LLM returned empty response'
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show data');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show error
    await expect(page.locator('text=error|Error|empty')).toBeVisible({ timeout: 5000 });
  });

  test('should allow retry after LLM failure', async ({ page }) => {
    let callCount = 0;

    // First call fails, second succeeds
    await page.route('/api/query/ask', async (route) => {
      callCount++;
      
      if (callCount === 1) {
        // First call: timeout
        await new Promise(resolve => setTimeout(resolve, 31000));
      } else {
        // Second call: success
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sql: 'SELECT * FROM users LIMIT 1',
            explanation: 'Retrieves first user',
            result: [{ id: 1, name: 'Test' }],
            error: null
          })
        });
        return;
      }
      
      await route.continue();
    });

    // First attempt
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Get users');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Wait for timeout
    await expect(page.locator('text=timeout|failed')).toBeVisible({ timeout: 35000 });

    // Retry: click Ask again
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should succeed this time
    await expect(page.locator('text=Test|result')).toBeVisible({ timeout: 10000 });
  });
});
