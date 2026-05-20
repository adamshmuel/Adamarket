import { test, expect } from '@playwright/test';
import { signInAsQA } from '../helpers/auth';

test.describe('Auth', () => {
  test('sign-in form loads and authenticates QA user', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({ path: 'test-results/auth/01-initial-load.png', fullPage: true });

    // Either we land on sign-in, or session was restored and we land on list
    const onSignIn = await page
      .locator('input[type="email"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (onSignIn) {
      await page.screenshot({ path: 'test-results/auth/02-sign-in-screen.png', fullPage: true });
      await signInAsQA(page);
    }

    // Confirm we ended up on the list screen
    await expect(page.getByPlaceholder(/הוסיפו/)).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: 'test-results/auth/03-list-screen.png', fullPage: true });
  });
});
