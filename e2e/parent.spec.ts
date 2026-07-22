import { expect, test } from '@playwright/test';

const START = '/?e2e=1';

test('parent mode opens via long-press and can reset progress', async ({ page }) => {
  await page.goto(START);

  // Long-press the gear (400ms in e2e mode) to open the gated parent screen.
  const gate = page.getByTestId('parent-gate');
  await gate.dispatchEvent('pointerdown');
  await expect(page.getByTestId('parent')).toBeVisible({ timeout: 4000 });

  // The dashboard lists all 12 levels and offers export + reset.
  await expect(page.getByTestId('parent-levels').locator('li')).toHaveCount(12);
  await expect(page.getByTestId('export')).toBeVisible();

  // Reset requires a confirm step.
  await page.getByTestId('reset').click();
  await expect(page.getByTestId('reset-confirm')).toBeVisible();
  await page.getByTestId('reset-confirm').click();
  await expect(page.getByTestId('reset')).toBeVisible(); // back to the un-confirmed state
});

test('a quick tap on the gear does NOT open parent mode', async ({ page }) => {
  await page.goto(START);
  const gate = page.getByTestId('parent-gate');
  await gate.dispatchEvent('pointerdown');
  await gate.dispatchEvent('pointerup'); // released immediately → cancels
  await page.waitForTimeout(700);
  await expect(page.getByTestId('parent')).toHaveCount(0);
  await expect(page.getByTestId('level-map')).toBeVisible();
});
