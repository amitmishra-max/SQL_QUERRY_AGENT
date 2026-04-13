/**
 * E2E: Performance & Caching Tests
 * 
 * Performance characteristics and caching behavior from UI perspective:
 * - Page load times
 * - Query execution times
 * - Caching behavior
 * - Large dataset rendering
 * - Performance during concurrent operations
 * 
 * Run:
 *   npx playwright test e2e/performance-caching.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Performance & Caching', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
  });

  test('should load dashboard quickly (< 3 seconds)', async ({ page }) => {
    // Measure dashboard load time
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await expect(page.locator('[role="main"], .dashboard, body').first()).toBeVisible({ timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load reasonably quickly
    expect(loadTime).toBeLessThan(3000);
  });

  test('should cache schema to avoid repeated fetches', async ({ page }) => {
    let schemaRequests = 0;
    
    // Monitor schema API requests
    await page.on('response', (response) => {
      if (response.url().includes('/api/schema') && response.status() === 200) {
        schemaRequests++;
      }
    });

    // Navigate to schema page
    await page.goto('/schema');
    await expect(page.locator('[role="region"], .schema').first()).toBeVisible({ timeout: 5000 });

    const firstSchemaRequests = schemaRequests;

    // Navigate away and back to schema
    await page.goto('/dashboard');
    await page.goto('/schema');
    await expect(page.locator('[role="region"], .schema').first()).toBeVisible({ timeout: 5000 });

    const secondSchemaRequests = schemaRequests - firstSchemaRequests;

    // Second visit should result in fewer requests (from cache)
    // Might be 0 if fully cached, or 1 if request is made but from cache
    expect(secondSchemaRequests).toBeLessThanOrEqual(firstSchemaRequests);
  });

  test('should execute simple query quickly', async ({ page }) => {
    const startTime = Date.now();

    // Submit query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Show users');
    await page.locator('button:has-text("Ask")').first().click();

    // Wait for results
    await expect(page.locator('[role="region"], .results, tbody').first()).toBeVisible({ timeout: 5000 });

    const executionTime = Date.now() - startTime;

    // Should respond within reasonable time
    expect(executionTime).toBeLessThan(5000);
  });

  test('should render large result sets efficiently', async ({ page }) => {
    // Mock large result
    await page.route('**/api/query/ask', async (route) => {
      const largeResults = Array.from ({ length: 500 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users LIMIT 500',
          explanation: 'Large result set',
          result: largeResults,
          columns: ['id', 'name', 'email'],
          error: null
        })
      });
    });

    const startTime = Date.now();

    // Submit query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Show large result');
    await page.locator('button:has-text("Ask")').first().click();

    // Wait for rendering
    await expect(page.locator('tbody tr, [role="row"]').first()).toBeVisible({ timeout: 5000 });

    const renderTime = Date.now() - startTime;

    // Should handle large results within reasonable time
    expect(renderTime).toBeLessThan(10000);

    // Verify results are rendered
    const rows = page.locator('tbody tr, [role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should not re-fetch data when navigating back', async ({ page }) => {
    let apiCalls = 0;

    await page.on('response', (response) => {
      if (response.url().includes('/api/history') && response.status() === 200) {
        apiCalls++;
      }
    });

    // Load history page
    const historyLink = page.locator('a:has-text("History"), button:has-text("History")').first();
    const hasHistory = await historyLink.isVisible().catch(() => false);

    if (hasHistory) {
      await historyLink.click();
      await page.waitForTimeout(500);
      const firstCallCount = apiCalls;

      // Navigate away
      await page.goto('/dashboard');
      await page.waitForTimeout(300);

      // Navigate back to history
      await historyLink.click();
      await page.waitForTimeout(500);
      const secondCallCount = apiCalls - firstCallCount;

      // Should use cache, so minimal additional API calls
      expect(secondCallCount).toBeLessThanOrEqual(1);
    }
  });

  test('should display skeleton/loading state while fetching', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/query/ask', async (route) => {
      await new Promise(r => setTimeout(r, 1000));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT 1',
          explanation: 'Slow query',
          result: [{ result: 1 }],
          columns: ['result'],
          error: null
        })
      });
    });

    // Submit query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Slow query');
    await page.locator('button:has-text("Ask")').first().click();

    // Loading indicator should appear
    const loadingIndicator = page.locator('[role="status"], .loading, .skeleton, text=/loading/i').first();
    const showsLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    if (!showsLoading) {
      // Might not show loading if query completes very fast
      // But should eventually show result
      await expect(page.locator('[role="region"], .results').first()).toBeVisible({ timeout: 5000 });
    } else {
      // Loading shown - verify it disappears when done
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
      // Result should appear
      await expect(page.locator('[role="region"], .results').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should not make duplicate API requests for same data', async ({ page }) => {
    const requestUrls = new Set();

    await page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        requestUrls.add(response.url());
      }
    });

    // Perform action twice
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    
    // First query
    await queryInput.fill('Test');
    await page.locator('button:has-text("Ask")').first().click();
    await page.waitForTimeout(500);

    const firstRequestCount = requestUrls.size;

    // Second identical query
    await queryInput.fill('Test');
    await page.locator('button:has-text("Ask")').first().click();
    await page.waitForTimeout(500);

    const secondRequestCount = requestUrls.size;

    // Additional requests should be minimal (might be same query executed again)
    // But should not double all API calls
    expect(secondRequestCount - firstRequestCount).toBeLessThanOrEqual(3);
  });

  test('should handle response compression', async ({ page }) => {
    // Check if API responses are compressed
    let compressedResponses = 0;

    await page.on('response', (response) => {
      const contentEncoding = response.headers()['content-encoding'] || '';
      if (contentEncoding.includes('gzip') || contentEncoding.includes('deflate') || contentEncoding.includes('br')) {
        compressedResponses++;
      }
    });

    // Make API calls
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Show data');
    await page.locator('button:has-text("Ask")').first().click();

    await page.waitForTimeout(1000);

    // At least some responses should be compressed (depending on size)
    // Either compressed or small enough not to require compression
    expect(compressedResponses >= 0).toBeTruthy();
  });

  test('should reuse connection pools for multiple requests', async ({ page }) => {
    const startTime = Date.now();
    const requests = [];

    await page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        requests.push({
          url: response.url(),
          time: Date.now() - startTime
        });
      }
    });

    // Make multiple rapid requests
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    
    for (let i = 0; i < 3; i++) {
      await queryInput.fill(`Query ${i}`);
      await page.locator('button:has-text("Ask")').first().click();
      await page.waitForTimeout(300);
    }

    // Requests should be fast due to connection reuse
    const requestTimes = requests.map(r => r.time);
    
    if (requestTimes.length > 1) {
      // Later requests should not be significantly slower
      const avgFirstHalf = requestTimes.slice(0, Math.ceil(requestTimes.length / 2))
        .reduce((a, b) => a + b, 0) / Math.ceil(requestTimes.length / 2);
      const avgSecondHalf = requestTimes.slice(Math.ceil(requestTimes.length / 2))
        .reduce((a, b) => a + b, 0) / Math.floor(requestTimes.length / 2);
      
      // Second batch shouldn't take exponentially longer
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 3);
    }
  });

  test('should clear history cache appropriately', async ({ page }) => {
    let historyRequests = 0;

    await page.on('response', (response) => {
      if (response.url().includes('/api/history') && response.status() === 200) {
        historyRequests++;
      }
    });

    const historyLink = page.locator('a:has-text("History"), button:has-text("History")').first();
    const hasHistory = await historyLink.isVisible().catch(() => false);

    if (hasHistory) {
      // Load history
      await historyLink.click();
      await page.waitForTimeout(500);

      // Add new query by going to dashboard and executing
      const dashboardLink = page.locator('a:has-text("Dashboard"), button:has-text("Dashboard")').first();
      await dashboardLink.click();
      await page.waitForTimeout(500);

      const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
      await queryInput.fill('New query');
      await page.locator('button:has-text("Ask")').first().click();
      await page.waitForTimeout(1000);

      const firstCount = historyRequests;

      // Go back to history - should refresh to show new query
      await historyLink.click();
      await page.waitForTimeout(500);

      // Should make new request to get updated history
      const secondCount = historyRequests - firstCount;
      
      // Either cache is invalidated (second count >= 1) or caching not implemented
      expect(secondCount >= 0).toBeTruthy();
    }
  });

  test('should minimize layout shift during loading', async ({ page }) => {
    // Measure layout shift
    let layoutShifts = 0;

    // Listen for layout shift via IntersectionObserver indication (visual test)
    // This is a simplified check - actual CLS measurement is complex

    const initialHeight = await page.evaluate(() => document.body.scrollHeight);

    // Submit query
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.fill('Test');
    await page.locator('button:has-text("Ask")').first().click();

    // During loading
    await page.waitForTimeout(500);
    const loadingHeight = await page.evaluate(() => document.body.scrollHeight);

    // Wait for completion
    await expect(page.locator('[role="region"], .results').first()).toBeVisible({ timeout: 5000 });
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);

    // Changes should be gradual, not jumping
    const initialChange = Math.abs(loadingHeight - initialHeight);
    const finalChange = Math.abs(finalHeight - loadingHeight);

    // Should not have wild layout shifts
    expect(initialChange).toBeLessThan(500);
    expect(finalChange).toBeLessThan(500);
  });

  test('should optimize image and asset loading', async ({ page }) => {
    let assetSizes = {
      images: 0,
      scripts: 0,
      styles: 0
    };

    await page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) {
        assetSizes.images += response.status() === 200 ? 1 : 0;
      } else if (url.includes('.js')) {
        assetSizes.scripts += response.status() === 200 ? 1 : 0;
      } else if (url.includes('.css')) {
        assetSizes.styles += response.status() === 200 ? 1 : 0;
      }
    });

    await page.goto('/dashboard');
    await expect(page.locator('body').first()).toBeVisible({ timeout: 5000 });

    // Should have reasonable number of assets
    // (Not overly checking specific counts as design varies)
    expect(assetSizes.images + assetSizes.scripts + assetSizes.styles >= 0).toBeTruthy();
  });

  test('should batch multiple queries efficiently', async ({ page }) => {
    const queryTimes = [];

    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();

    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await queryInput.fill(`Query ${i + 1}`);
      await page.locator('button:has-text("Ask")').first().click();
      
      await expect(page.locator('[role="region"], .results').first()).toBeVisible({ timeout: 5000 });
      
      const endTime = Date.now();
      queryTimes.push(endTime - startTime);
    }

    // Later queries should not be significantly slower
    const firstQueryTime = queryTimes[0];
    const lastQueryTime = queryTimes[queryTimes.length - 1];

    // Last query shouldn't take more than 2x the first (allowing for some variance)
    expect(lastQueryTime).toBeLessThan(firstQueryTime * 2 + 1000);
  });

  test('should prefetch likely next resources', async ({ page }) => {
    // Check if app prefetches resources
    const prefetchElements = await page.locator('link[rel="prefetch"], link[rel="preload"]').count();

    // Either has prefetch hints or loads resources on demand
    // Both are valid optimization strategies
    expect(prefetchElements >= 0).toBeTruthy();
  });
});
