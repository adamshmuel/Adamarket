import { test, expect } from '@playwright/test';
import { signInAsQA } from '../helpers/auth';

test.describe('List — add, check, uncheck, delete (optimistic)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await signInAsQA(page);
    // Allow realtime to settle so existing items don't appear mid-test
    await page.waitForTimeout(2_000);
  });

  test('add → check → uncheck → delete flow', async ({ page }) => {
    const TEST_ITEM = `qa${Date.now()}`;
    const input = page.getByPlaceholder(/הוסיפו/);

    // ─── Add ──────────────────────────────────────────────────────────
    await input.fill(TEST_ITEM);
    await page.screenshot({ path: 'test-results/list/01-typed.png', fullPage: true });

    // The + button is sibling of the input — locate via aria-label "הוסף"
    await page.locator('[aria-label="הוסף"]').click();

    // Item must appear (optimistic — should be immediate)
    await expect(page.getByText(TEST_ITEM, { exact: false })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/list/02-added.png', fullPage: true });

    // ─── Check ────────────────────────────────────────────────────────
    const checkbox = page.locator(`[role="checkbox"][aria-label="${TEST_ITEM}"]`).first();
    await checkbox.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/list/03-checked.png', fullPage: true });

    // ─── Uncheck ──────────────────────────────────────────────────────
    await checkbox.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/list/04-unchecked.png', fullPage: true });

    // ─── Delete — click the × on the row that contains our test item ──
    // The × buttons all share aria-label="מחקו" — scope by row using getByText then ..
    const itemText = page.getByText(TEST_ITEM, { exact: false });
    const row = itemText.locator('xpath=ancestor::*[.//div[@role="checkbox"]][1]');
    await row.locator('[aria-label="מחקו"]').click();

    await expect(page.getByText(TEST_ITEM, { exact: false })).not.toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/list/05-deleted.png', fullPage: true });
  });
});
