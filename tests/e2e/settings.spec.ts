import { test, expect } from '@playwright/test';
import { signInAsQA } from '../helpers/auth';

test.describe('Settings — sign out', () => {
  test('clicking "התנתקו" actually signs the user out', async ({ page }) => {
    // Auto-confirm the browser confirm() dialog that our cross-platform helper
    // uses on web (lib/alert.ts → window.confirm).
    page.on('dialog', (d) => d.accept());

    await page.goto('/');
    await signInAsQA(page);

    // Navigate to Settings tab
    await page.locator('a[href="/settings"]').click();
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: 'test-results/settings/01-settings-screen.png', fullPage: true });

    // Click the sign-out button (Hebrew label "התנתקו")
    await page.locator('[aria-label="התנתקו"]').click();
    await page.waitForTimeout(2_000);
    await page.screenshot({ path: 'test-results/settings/02-after-sign-out.png', fullPage: true });

    // After sign-out, the user must NOT see the list-screen input.
    // The sign-in screen (email field) must be visible instead.
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/הוסיפו/)).not.toBeVisible();
  });
});
