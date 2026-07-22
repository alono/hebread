import { expect, test } from '@playwright/test';

test('home shows the niqqud-ed logo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('logo')).toHaveText('קוֹרֵא עִבְרִית');
});
