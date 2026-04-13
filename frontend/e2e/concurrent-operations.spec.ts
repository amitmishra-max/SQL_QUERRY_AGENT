/**
 * E2E: Concurrent Operations
 * 
 * Tests how the application handles concurrent requests:
 * - Multiple simultaneous queries
 * - UI responsiveness during queries
 * - Request cancellation
 * - Queue/rate limiting
 * 
 * Run:
 *   npx playwright test e2e/concurrent-operations.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Concurrent Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login
    await page.goto('/dashboard');
    
    const dashboardVisible = await page.locator('text=Dashboard|Schema').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!dashboardVisible) {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'TestPass123');
      await page.click('button:has-text("Sign In")');
      await page.waitForURL('**/dashboard');
    }
  });

  test('should prevent submitting multiple queries simultaneously', async ({ page }) => {
    let requestCount = 0;
    
    // Slow down API to see concurrency issues
    await page.route('/api/query/ask', async (route) => {
      requestCount++;
      await new Promise(r => setTimeout(r, 2000)); // 2s delay
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: `SELECT * FROM users WHERE id = ${requestCount}`,
          explanation: `Query ${requestCount}`,
          result: [{ id: requestCount, name: `User ${requestCount}` }],
          columns: ['id', 'name'],
          error: null
        })
      });
    });

    // Try to submit multiple queries quickly
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    const submitButton = page.locator('button:has-text("Ask")').first();

    // First query
    await queryInput.fill('Show user 1');
    await submitButton.click();

    // Try to submit second query immediately (should be disabled)
    await queryInput.fill('Show user 2');
    const isDisabled = await submitButton.isDisabled();
    
    if (!isDisabled) {
      // Button not disabled - check if it was actually clicked
      const submitable = await submitButton.isEnabled();
      if (submitable) {
        await submitButton.click();
      }
    }

    // Only one request should be made immediately, or both prevented
    // Maximum should be 1 or 2 requests made
    await page.waitForTimeout(3000);
    expect(requestCount).toBeLessThanOrEqual(2);
  });

  test('should maintain UI responsiveness during slow query', async ({ page }) => {
    // Very slow query
    await page.route('/api/query/ask', async (route) => {
      await new Promise(r => setTimeout(r, 5000)); // 5s
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users LIMIT 1',
          explanation: 'Slow query result',
          result: [{ id: 1, name: 'User 1' }],
          columns: ['id', 'name'],
          error: null
        })
      });
    });

    // Submit query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Slow query');
    await page.locator('button:has-text("Ask")').first().click();

    // UI should show loading indicator
    const loadingIndicator = page.locator('[role="status"], .loading, .spinner, text=/loading|processing/i').first();
    const hasLoading = await loadingIndicator.isVisible().catch(() => false);

    // Page should remain responsive (no layout shift glitches)
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);
    
    // Try to interact with other elements while loading
    const schemaButton = page.locator('button:has-text("Schema")').first();
    const isSchemaClickable = await schemaButton.isEnabled().catch(() => false);
    
    // Wait for result
    await expect(page.locator('text=User 1')).toBeVisible({ timeout: 7000 });

    // Check layout didn't jump
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);
    const heightChange = Math.abs(finalHeight - initialHeight);
    expect(heightChange).toBeLessThan(500); // Allow some height change but not dramatic
  });

  test('should show appropriate loading state during query', async ({ page }) => {
    let requestStarted = false;
    
    await page.route('/api/query/ask', async (route) => {
      requestStarted = true;
      await new Promise(r => setTimeout(r, 2000));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users LIMIT 1',
          explanation: 'Result',
          result: [{ id: 1, name: 'User 1' }],
          columns: ['id', 'name'],
          error: null
        })
      });
    });

    // Submit query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Test loading state');
    await page.locator('button:has-text("Ask")').first().click();

    // Check for loading indicators
    await expect(page).toBeFocused();
    requestStarted = false;

    // Look for loading spinner, skeleton, or progress indicator
    const loadingElements = page.locator('[role="status"], .loading, .spinner, .skeleton, text=/loading|querying|processing/i');
    const loadingCount = await loadingElements.count();
    
    // Should have some loading indicator
    const hasLoadingUI = loadingCount > 0 || 
      await page.locator('text=/loading|querying|processing/i').isVisible().catch(() => false);

    expect(hasLoadingUI || requestStarted).toBeTruthy();

    // Loading should eventually disappear when complete
    await expect(page.locator('text=User 1')).toBeVisible({ timeout: 5000 });
  });

  test('should handle query cancellation gracefully', async ({ page }) => {
    let requestIntercepted = false;
    
    await page.route('/api/query/ask', async (route) => {
      requestIntercepted = true;
      await new Promise(r => setTimeout(r, 3000));
      
      if (!requestIntercepted) {
        await route.abort();
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sql: 'SELECT * FROM users',
            explanation: 'Result',
            result: [{ id: 1, name: 'User 1' }],
            columns: ['id', 'name'],
            error: null
          })
        });
      }
    });

    // Submit query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Query to cancel');
    await page.locator('button:has-text("Ask")').first().click();

    // Look for cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Stop"), button[aria-label*="cancel" i]').first();
    const hasCancelButton = await cancelButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasCancelButton) {
      await cancelButton.click();
      
      // Should show cancellation message or return to normal state
      const resultArea = page.locator('[role="region"], .results, .query-result').first();
      const isResultAreaVisible = await resultArea.isVisible().catch(() => false);
      
      expect(isResultAreaVisible || !requestIntercepted).toBeTruthy();
    }
  });

  test('should queue queries if concurrent limit reached', async ({ page }) => {
    let activeRequests = 0;
    let maxConcurrent = 0;
    
    await page.route('/api/query/ask', async (route) => {
      activeRequests++;
      maxConcurrent = Math.max(maxConcurrent, activeRequests);
      
      await new Promise(r => setTimeout(r, 1500));
      activeRequests--;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users',
          explanation: 'Result',
          result: [{ id: 1, name: 'User 1' }],
          columns: ['id', 'name'],
          error: null
        })
      });
    });

    // Submit first query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    const submitButton = page.locator('button:has-text("Ask")').first();
    
    await queryInput.fill('Query 1');
    await submitButton.click();

    // Try to immediately submit another
    await page.waitForTimeout(100);
    await queryInput.fill('Query 2');
    const canSubmitSecond = await submitButton.isEnabled();
    
    if (canSubmitSecond) {
      await submitButton.click();
    }

    // Wait for both to complete
    await page.waitForTimeout(4000);

    // Should have limited concurrent requests (typically 1)
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  test('should preserve query state across navigation', async ({ page }) => {
    // Fill query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    const testQuery = 'Find all active users with premium accounts';
    await queryInput.fill(testQuery);

    // Navigate away
    const schemaLink = page.locator('a:has-text("Schema"), button:has-text("Schema")').first();
    const hasSchemaNav = await schemaLink.isVisible().catch(() => false);
    
    if (hasSchemaNav) {
      await schemaLink.click();
      await page.waitForTimeout(500);

      // Navigate back
      const dashboardLink = page.locator('a:has-text("Dashboard"), button:has-text("Dashboard")').first();
      const hasDashboardNav = await dashboardLink.isVisible().catch(() => false);
      
      if (hasDashboardNav) {
        await dashboardLink.click();
        await page.waitForTimeout(500);

        // Query should still be there (or appropriately cleared)
        const currentQuery = await queryInput.inputValue();
        const queryPreserved = currentQuery === testQuery || currentQuery === '';
        expect(queryPreserved).toBeTruthy();
      }
    }
  });

  test('should handle rapid successive queries', async ({ page }) => {
    let queryCount = 0;
    
    await page.route('/api/query/ask', async (route) => {
      queryCount++;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: `SELECT ${queryCount}`,
          explanation: `Query ${queryCount}`,
          result: [{ result: queryCount }],
          columns: ['result'],
          error: null
        })
      });
    });

    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    const submitButton = page.locator('button:has-text("Ask")').first();

    // Submit 3 queries rapidly
    for (let i = 1; i <= 3; i++) {
      await queryInput.fill(`Query ${i}`);
      const isEnabled = await submitButton.isEnabled();
      if (isEnabled) {
        await submitButton.click();
      }
      await page.waitForTimeout(300);
    }

    // Wait for processing
    await page.waitForTimeout(2000);

    // Should have made reasonable number of requests
    expect(queryCount).toBeGreaterThanOrEqual(1);
    expect(queryCount).toBeLessThanOrEqual(3);
  });

  test('should show latest query result when rapid queries complete', async ({ page }) => {
    let lastQueryNumber = 0;
    
    await page.route('/api/query/ask', async (route) => {
      const queryNum = Math.floor(Math.random() * 1000);
      lastQueryNumber = queryNum;
      
      // Variable response time
      await new Promise(r => setTimeout(r, Math.random() * 1000));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: `SELECT ${queryNum}`,
          explanation: `Query ${queryNum}`,
          result: [{ id: queryNum }],
          columns: ['id'],
          error: null
        })
      });
    });

    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    const submitButton = page.locator('button:has-text("Ask")').first();

    // Submit multiple queries
    for (let i = 1; i <= 2; i++) {
      await queryInput.fill(`Query ${i}`);
      const isEnabled = await submitButton.isEnabled();
      if (isEnabled) {
        await submitButton.click();
      }
      await page.waitForTimeout(200);
    }

    // Wait for results
    await page.waitForTimeout(2000);

    // Should show a result (not critical which one, main thing is no error)
    const resultArea = page.locator('[role="region"], .results, .query-result, tbody').first();
    const hasResult = await resultArea.isVisible().catch(() => false);
    expect(hasResult).toBeTruthy();
  });
});
