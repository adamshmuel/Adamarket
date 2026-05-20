import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInAsQA } from '../helpers/auth';

// Run @axe-core on each major screen.
// Fail on any "serious" or "critical" violation — these are the levels that
// block usability for elderly relatives (per the israeli-accessibility-compliance skill).

async function audit(page: import('@playwright/test').Page, name: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  if (blocking.length > 0) {
    console.error(`[a11y] ${name} — ${blocking.length} blocking violations:`);
    for (const v of blocking) {
      console.error(`  - ${v.id} (${v.impact}): ${v.help}`);
      console.error(`    nodes: ${v.nodes.length}`);
    }
  }
  expect(blocking, `Blocking a11y violations on ${name}`).toEqual([]);
}

test.describe('Accessibility — axe-core sweep', () => {
  test('sign-in screen has no blocking a11y issues', async ({ page }) => {
    await page.goto('/');
    // If we land on list (existing session), sign out first? For simplicity,
    // we just audit whatever screen is shown.
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: 'test-results/a11y/01-screen.png', fullPage: true });
    await audit(page, 'initial screen');
  });

  test('list screen has no blocking a11y issues', async ({ page }) => {
    await page.goto('/');
    await signInAsQA(page);
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: 'test-results/a11y/02-list.png', fullPage: true });
    await audit(page, 'list');
  });

  test('scan screen has no blocking a11y issues', async ({ page }) => {
    await page.goto('/');
    await signInAsQA(page);
    await page.locator('a[href="/scan"]').click();
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: 'test-results/a11y/03-scan.png', fullPage: true });
    await audit(page, 'scan');
  });

  test('settings screen has no blocking a11y issues', async ({ page }) => {
    await page.goto('/');
    await signInAsQA(page);
    await page.locator('a[href="/settings"]').click();
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: 'test-results/a11y/04-settings.png', fullPage: true });
    await audit(page, 'settings');
  });
});
