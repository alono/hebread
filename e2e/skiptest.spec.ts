import { expect, Page, test } from '@playwright/test';

const START = '/?e2e=1';

async function resultOrAdvance(page: Page, prevIndex: string | null) {
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('skip-result').isVisible().catch(() => false)) return '__result__';
        return page.getByTestId('skiptest').getAttribute('data-index').catch(() => null);
      },
      { timeout: 8000 },
    )
    .not.toBe(prevIndex);
}

test('level 1 is completed by passing its skip test, promoting the child', async ({ page }) => {
  await page.goto(START);

  // Level 1 starts not completed; level 2 is not yet the "current" ring.
  await expect(page.getByTestId('level-1-station')).toHaveAttribute('data-completed', 'false');

  await page.getByTestId('level-1-skip').click();
  await page.getByTestId('skip-begin').click();
  await expect(page.getByTestId('skiptest')).toBeVisible();

  // Answer all 10 correctly.
  for (let i = 0; i < 30; i++) {
    if (await page.getByTestId('skip-result').isVisible().catch(() => false)) break;
    const idx = await page.getByTestId('skiptest').getAttribute('data-index');
    await page.locator('[data-testid="answer"][data-correct="true"]').first().click();
    await resultOrAdvance(page, idx);
  }

  const result = page.getByTestId('skip-result');
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('data-passed', 'true');

  await page.getByTestId('skip-done').click();

  // Back on the map, level 1 is now complete and marked fast-tracked (⚡).
  const station = page.getByTestId('level-1-station');
  await expect(station).toBeVisible();
  await expect(station).toHaveAttribute('data-completed', 'true');
  await expect(station).toHaveAttribute('data-fasttrack', 'true');

  // Level 1 done → level 2 is now the current station (the child is promoted).
  await expect(page.getByTestId('level-1-station')).toHaveAttribute('data-current', 'false');
  await expect(page.getByTestId('level-2-station')).toHaveAttribute('data-current', 'true');

  // Completion survives a refresh.
  await page.reload();
  await expect(page.getByTestId('level-1-station')).toHaveAttribute('data-completed', 'true');
});
