import { test, expect } from '@playwright/test';
import path from 'path';
import { signInAsQA } from '../helpers/auth';

const FRIDGE_IMAGE = path.resolve(__dirname, '..', 'fixtures', 'fridge.jpg');

test.describe('Scan — OCR pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await signInAsQA(page);
  });

  test('full OCR pipeline: gallery upload → review → confirm', async ({ page }) => {
    // Navigate to scan tab via the tab-bar anchor (expo-router uses <a href="/scan">)
    await page.locator('a[href="/scan"]').click();
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: 'test-results/scan/01-scan-screen.png', fullPage: true });

    // Back pill must be visible (no dead end)
    await expect(page.locator('[aria-label="חזרה לרשימה"]')).toBeVisible({ timeout: 10_000 });

    // ─── Inject the fridge photo via the file chooser ───────────────────
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[aria-label="בחרו מהגלריה"]').click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(FRIDGE_IMAGE);

    // ─── Wait for OCR pipeline ─────────────────────────────────────────
    // The review screen's confirm button reads "הוסיפו N פריטים"
    await expect(page.getByText(/הוסיפו .* פריטים/).first()).toBeVisible({ timeout: 90_000 });
    await page.screenshot({ path: 'test-results/scan/02-review-screen.png', fullPage: true });

    // ─── Confirm — add detected items ──────────────────────────────────
    await page.getByText(/הוסיפו .* פריטים/).first().click();

    // Either we land on scan idle or list — wait then screenshot
    await page.waitForTimeout(3_000);
    await page.screenshot({ path: 'test-results/scan/03-after-confirm.png', fullPage: true });

    // Navigate to list and verify
    await page.locator('a[href="/"]').first().click();
    await page.waitForTimeout(2_000);
    await page.screenshot({ path: 'test-results/scan/04-list-with-ocr-items.png', fullPage: true });
  });
});
