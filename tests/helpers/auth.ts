import { Page, expect } from '@playwright/test';

// Adamarket QA user — exists in the production Supabase project.
// Scoped to a single QA household ("משפחת QA"). Not a real user.
export const QA_USER = {
  email: 'claude-qa@adamarket.test',
  password: 'qatest123',
} as const;

/**
 * Sign in as the shared QA user and wait until the list screen is rendered.
 * Idempotent — if the page is already on the list, returns immediately.
 */
export async function signInAsQA(page: Page): Promise<void> {
  // If already authenticated, the list screen has the "הוסיפו פריט..." input.
  const alreadyOnList = page.getByPlaceholder(/הוסיפו/);
  if (await alreadyOnList.isVisible().catch(() => false)) return;

  // Email field — placeholder is "name@example.com" (English), so use type
  await page.locator('input[type="email"]').first().fill(QA_USER.email);
  await page.locator('input[type="password"]').first().fill(QA_USER.password);

  // Submit button — Hebrew label "התחברו"
  await page.getByRole('button', { name: /התחברו|התחבר|כניסה/ }).first().click();

  // Wait for the list screen — the placeholder is the unique signal
  await expect(page.getByPlaceholder(/הוסיפו/)).toBeVisible({ timeout: 30_000 });
}
