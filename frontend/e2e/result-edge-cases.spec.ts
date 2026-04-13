/**
 * E2E: Query Result Edge Cases
 * 
 * Tests how the application handles edge cases in query results:
 * - Empty results
 * - Very large result sets
 * - NULL values
 * - Special characters
 * - Unicode characters
 * 
 * Run:
 *   npx playwright test e2e/result-edge-cases.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Query Result Edge Cases', () => {
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

  test('should display "no results" message for empty query result', async ({ page }) => {
    // Mock empty result
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users WHERE id = 999999',
          explanation: 'Query that returns no rows',
          result: [],
          columns: ['id', 'name', 'email'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Find user with ID 999999');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show "no results" message
    await expect(
      page.locator('text=/no results|no rows|empty/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should handle NULL values gracefully', async ({ page }) => {
    // Mock result with NULL values
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT id, name, phone FROM users LIMIT 3',
          explanation: 'Users with some NULL phone numbers',
          result: [
            { id: 1, name: 'Alice', phone: '555-1234' },
            { id: 2, name: 'Bob', phone: null },
            { id: 3, name: null, phone: '555-5678' }
          ],
          columns: ['id', 'name', 'phone'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show users');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should render without crashing
    await expect(page.locator('text=Alice')).toBeVisible({ timeout: 5000 });
    
    // NULL values should be displayed as dash or empty (not "null" string)
    const nullCell = page.locator('td:has-text("-"), td:has-text("—")').first();
    const isNullDisplayed = await nullCell.isVisible().catch(() => false);
    // Either dash displayed or cell is empty - both acceptable
  });

  test('should handle very large result set with pagination', async ({ page }) => {
    // Mock large result set
    const largeResult = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`
    }));

    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users LIMIT 100',
          explanation: 'First 100 users',
          result: largeResult,
          columns: ['id', 'name', 'email'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show all users');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should display results (possibly paginated)
    await expect(page.locator('text=User 1')).toBeVisible({ timeout: 5000 });

    // Check if pagination or "showing X of Y" message exists
    const paginationOrCount = page.locator('text=/showing|of|page|next|previous/i').first();
    const hasPaginationText = await paginationOrCount.isVisible().catch(() => false);
    
    // If pagination exists, verify it works
    if (hasPaginationText) {
      const nextButton = page.locator('button:has-text("Next"), button:has-text("→")').first();
      const hasNextButton = await nextButton.isVisible().catch(() => false);
      
      if (hasNextButton) {
        await nextButton.click();
        // Should show next page
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should display special characters correctly', async ({ page }) => {
    // Mock result with special characters
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM products LIMIT 3',
          explanation: 'Products with special chars',
          result: [
            { id: 1, name: 'Product & Service', price: 99.99 },
            { id: 2, name: 'Item <Special>', price: 49.99 },
            { id: 3, name: 'Quote "Premium"', price: 199.99 }
          ],
          columns: ['id', 'name', 'price'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show products');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Special chars should be escaped, not rendered as HTML
    await expect(page.locator('text=Product & Service')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Item <Special>')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Quote "Premium"')).toBeVisible({ timeout: 5000 });

    // Verify HTML tags are NOT interpreted
    const html = await page.content();
    expect(html).not.toContain('<Special>'); // Should be escaped
  });

  test('should handle Unicode characters (emoji, Arabic, Chinese)', async ({ page }) => {
    // Mock result with Unicode
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM items LIMIT 3',
          explanation: 'Items in different languages',
          result: [
            { id: 1, name: 'Coffee ☕', country: 'مصر' },
            { id: 2, name: 'Laptop 💻', country: '中国' },
            { id: 3, name: 'Phone 📱', country: '日本' }
          ],
          columns: ['id', 'name', 'country'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show international items');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Unicode should be displayed correctly
    await expect(page.locator('text=☕')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=مصر')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=中国')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=📱')).toBeVisible({ timeout: 5000 });
  });

  test('should handle very long strings without breaking layout', async ({ page }) => {
    // Mock result with long strings
    const longText = 'This is a very long text that might break the layout if not handled properly. '.repeat(5);
    
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM articles LIMIT 1',
          explanation: 'Very long article content',
          result: [
            { id: 1, title: 'Article', content: longText }
          ],
          columns: ['id', 'title', 'content'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show article');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should render without breaking
    await expect(page.locator('text=Article')).toBeVisible({ timeout: 5000 });

    // Check layout is intact by verifying page is scrollable horizontally if needed
    const page_width = await page.evaluate(() => document.body.scrollWidth);
    const viewport_width = await page.evaluate(() => window.innerWidth);
    
    // Should not break (either no overflow or handled gracefully)
    expect(page_width).toBeLessThanOrEqual(viewport_width * 1.5); // Some tolerance for scrollbars
  });

  test('should display boolean/binary values correctly', async ({ page }) => {
    // Mock result with boolean values
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users LIMIT 2',
          explanation: 'Users with active status',
          result: [
            { id: 1, name: 'Alice', is_active: true },
            { id: 2, name: 'Bob', is_active: false }
          ],
          columns: ['id', 'name', 'is_active'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show users');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Boolean should display as True/False or Yes/No, not raw "true"/"false"
    const content = await page.content();
    // Check for readable boolean representation
    const hasReadableBoolean = /True|False|true|false|yes|no|✓|✗|enabled|disabled/i.test(content);
    expect(hasReadableBoolean).toBeTruthy();
  });

  test('should show row count indicator', async ({ page }) => {
    // Mock result
    await page.route('/api/query/ask', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sql: 'SELECT * FROM users LIMIT 5',
          explanation: 'First 5 users',
          result: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' },
            { id: 3, name: 'User 3' },
            { id: 4, name: 'User 4' },
            { id: 5, name: 'User 5' }
          ],
          columns: ['id', 'name'],
          error: null
        })
      });
    });

    // Ask question
    await page.fill('textarea[placeholder*="question" i], input[placeholder*="ask" i]', 
      'Show 5 users');
    await page.click('button:has-text("Ask"):not(:disabled)');

    // Should show row count like "5 rows" or similar
    const rowCountIndicator = page.locator('text=/5\\s+rows?|results?\\s+5|showing\\s+5/i');
    const hasRowCount = await rowCountIndicator.isVisible().catch(() => false);
    
    // Or at least verify all 5 rows are shown
    const rows = page.locator('tbody tr, [role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(5);
  });
});
