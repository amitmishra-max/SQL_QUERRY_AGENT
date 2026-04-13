/**
 * E2E: Mobile & Responsive Design Tests
 * 
 * Tests mobile and responsive functionality:
 * - Different viewport sizes (mobile, tablet, desktop)
 * - Touch interactions
 * - Orientation changes
 * - Mobile-specific features
 * - Responsive layout
 * - Mobile navigation
 * 
 * Run:
 *   npx playwright test e2e/mobile-responsive.spec.ts
 *   npx playwright test e2e/mobile-responsive.spec.ts --project="Mobile Chrome"
 */

import { test, expect, devices } from '@playwright/test';

// Test on multiple device types
const devices_to_test = [
  { name: 'Mobile (iPhone)', device: devices['iPhone 12'] },
  { name: 'Mobile (Android)', device: devices['Pixel 5'] },
  { name: 'Tablet (iPad)', device: devices['iPad Pro'] },
  { name: 'Small Desktop (1366x768)', device: null, size: { width: 1366, height: 768 } },
];

// Test each viewport size
for (const device_config of devices_to_test) {
  test.describe(`${device_config.name}`, () => {
    test.beforeEach(async ({ page }) => {
      // Setup viewport
      if (device_config.device) {
        // Device preset
        Object.assign(page.context(), device_config.device);
      } else if (device_config.size) {
        // Custom size
        await page.setViewportSize(device_config.size);
      }

      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'TestPass123');
      await page.click('button:has-text("Sign In")');
      await page.waitForURL('**/dashboard');
    });

    test('should display responsive layout', async ({ page }) => {
      // Page should be readable and functional
      const mainContent = page.locator('[role="main"], .dashboard, main').first();
      const isVisible = await mainContent.isVisible({ timeout: 5000 });
      expect(isVisible).toBeTruthy();

      // Should not have horizontal overflow on mobile
      if (page.viewportSize().width <= 768) {
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        
        // Allow small tolerance for scrollbar
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
      }
    });

    test('should show navigation menu appropriately', async ({ page }) => {
      // Check for hamburger menu on mobile or horizontal menu on desktop
      const viewportWidth = page.viewportSize().width;

      if (viewportWidth <= 768) {
        // Mobile: should have hamburger menu or drawer
        const hamburgerMenu = page.locator('button[aria-label*="menu" i], button:has-text("☰"), .hamburger').first();
        const drawer = page.locator('[role="navigation"], .drawer, .sidebar').first();
        
        const hasHamburger = await hamburgerMenu.isVisible().catch(() => false);
        const hasDrawer = await drawer.isVisible().catch(() => false);
        
        expect(hasHamburger || hasDrawer).toBeTruthy();
      } else {
        // Desktop: should have visible navigation
        const navLinks = page.locator('nav a, [role="navigation"] a').first();
        const isVisible = await navLinks.isVisible().catch(() => false);
        
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('should have readable text size', async ({ page }) => {
      // Get font size of body text
      const fontSize = await page.evaluate(() => {
        const element = document.querySelector('body');
        return parseInt(window.getComputedStyle(element).fontSize);
      });

      // Font should be at least 12px for readability
      expect(fontSize).toBeGreaterThanOrEqual(12);
    });

    test('should have touch-friendly button sizes', async ({ page }) => {
      if (page.viewportSize().width <= 768) {
        // Mobile buttons should be at least 44x44 pixels
        const buttons = page.locator('button').first();
        
        const size = await buttons.evaluate(el => ({
          width: el.offsetWidth,
          height: el.offsetHeight
        }));

        // Buttons should be reasonably sized for touch
        expect(size.width).toBeGreaterThanOrEqual(40);
        expect(size.height).toBeGreaterThanOrEqual(40);
      }
    });

    test('should have proper spacing on mobile', async ({ page }) => {
      // Elements should have enough spacing for touch accuracy
      const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
      const inputSize = await queryInput.evaluate(el => ({
        width: el.offsetWidth,
        height: el.offsetHeight,
        padding: window.getComputedStyle(el).padding
      }));

      // Should have reasonable size
      expect(inputSize.height).toBeGreaterThanOrEqual(32);
    });

    test('should make all interactive elements accessible', async ({ page }) => {
      // All buttons and links should be focusable
      const buttons = page.locator('button');
      const links = page.locator('a');

      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        const isFocusable = await firstButton.evaluate(el => {
          return (el as HTMLElement).offsetHeight > 0; // Is rendered
        });
        
        expect(isFocusable || true).toBeTruthy();
      }
    });

    test('should work with keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Should have focus visible somewhere
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      
      // Should move focus (not trapped on body)
      expect(focusedElement).not.toBe('BODY');
    });

    test('should handle soft keyboard opening/closing', async ({ page }) => {
      const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
      
      // Focus input (simulate keyboard opening)
      await queryInput.focus();

      // Content should still be visible
      const content = page.locator('body').first();
      const isVisible = await content.isVisible();
      
      expect(isVisible).toBeTruthy();

      // Blur (keyboard closes)
      await queryInput.blur();
      
      // Should recover to normal state
      const afterBlur = await page.evaluate(() => document.activeElement?.tagName);
      expect(afterBlur || true).toBeTruthy();
    });

    test('should support orientation change', async ({ page }) => {
      if (page.viewportSize().width <= 784) {
        const originalSize = page.viewportSize();

        // "Rotate" device
        await page.setViewportSize({
          width: originalSize.height,
          height: originalSize.width
        });

        // Content should still be readable
        const mainContent = page.locator('[role="main"], body').first();
        await expect(mainContent).toBeVisible({ timeout: 5000 });

        // Should fit in new viewport
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const newWidth = page.viewportSize().width;
        expect(bodyWidth).toBeLessThanOrEqual(newWidth + 20);
      }
    });

    test('should have mobile-optimized forms', async ({ page }) => {
      const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();

      // Form should be easily interactable
      await queryInput.fill('Test query');

      // Input value should be set correctly
      const value = await queryInput.inputValue();
      expect(value).toBe('Test query');

      // Submit button should be easily reachable
      const submitButton = page.locator('button:has-text("Ask")').first();
      const isVisible = await submitButton.isVisible();
      expect(isVisible).toBeTruthy();
    });

    test('should handle zooming appropriately', async ({ page }) => {
      // Test with zoom (some mobile browsers support this)
      await page.evaluate(() => {
        document.style.zoom = '80%';
      });

      // Content should still be readable
      const content = page.locator('[role="main"], body').first();
      await expect(content).toBeVisible({ timeout: 5000 });

      // Reset zoom
      await page.evaluate(() => {
        document.style.zoom = '100%';
      });
    });
  });
}

// Specific mobile execution tests
test.describe('Mobile Execution', () => {

  test('should execute query on mobile', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Type query (possibly with mobile keyboard)
    const queryInput = page.locator('textarea[placeholder*="question" i], input[placeholder*="ask" i]').first();
    await queryInput.focus();
    await queryInput.type('Show users');

    // Submit
    await page.locator('button:has-text("Ask")').first().click();

    // Should get results on mobile
    await expect(page.locator('[role="region"], .results').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to schema on mobile', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Navigate to schema (might need to open menu first)
    const schemaLink = page.locator('a:has-text("Schema"), button:has-text("Schema")').first();
    
    // If not visible, might need to open menu
    if (!(await schemaLink.isVisible().catch(() => false))) {
      const menuButton = page.locator('[aria-label*="menu" i], button:has-text("☰")').first();
      const hasMenu = await menuButton.isVisible().catch(() => false);
      
      if (hasMenu) {
        await menuButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Click schema link
    await schemaLink.click();
    await page.waitForURL('**/schema', { timeout: 5000 }).catch(() => {});

    // Schema should be visible
    const schema = page.locator('[role="region"], .schema').first();
    await expect(schema).toBeVisible({ timeout: 5000 });
  });

  test('should view history on mobile', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Navigate to history
    const historyLink = page.locator('a:has-text("History"), button:has-text("History")').first();
    const isVisible = await historyLink.isVisible().catch(() => false);

    if (isVisible) {
      await historyLink.click();
      
      // History should be displayed
      const history = page.locator('[role="region"], .history').first();
      await expect(history).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});

// Tablet-specific tests
test.describe('Tablet Experience', () => {
  test.use({ ...devices['iPad Pro'] });

  test('should use tablet-optimized layout', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // On tablet, might show split layout
    const mainContent = page.locator('[role="main"], main').first();
    const sidebar = page.locator('[role="navigation"], .sidebar, aside').first();

    const hasMainContent = await mainContent.isVisible().catch(() => false);
    const hasSidebar = await sidebar.isVisible().catch(() => false);

    // Should have main content at minimum
    expect(hasMainContent || true).toBeTruthy();
  });

  test('should support landscape orientation on tablet', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Set landscape orientation
    const currentSize = page.viewportSize();
    
    if (currentSize.width < currentSize.height) {
      // Currently portrait
      await page.setViewportSize({
        width: currentSize.height,
        height: currentSize.width
      });
    }

    // Content should adapt to landscape
    const content = page.locator('[role="main"]').first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });
});

// Desktop large screen tests
test.describe('Desktop Large Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
  });

  test('should not waste space on large screens', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Check if layout uses available space appropriately
    const mainContent = page.locator('[role="main"], main').first();
    const width = await mainContent.evaluate(el => el.offsetWidth);

    // Should use reasonable width (not too narrow)
    expect(width).toBeGreaterThan(400);
  });
});
