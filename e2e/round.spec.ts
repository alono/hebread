import { expect, Page, test } from '@playwright/test';

// ?e2e=1 collapses the feedback delays so the flow runs fast and deterministically.
const START = '/?e2e=1';

async function summaryVisible(page: Page): Promise<boolean> {
  return page.getByTestId('summary').isVisible().catch(() => false);
}

/** Wait until the round advances off `prevId` or the summary appears. */
async function waitAdvance(page: Page, prevId: string) {
  await expect
    .poll(
      async () => {
        if (await summaryVisible(page)) return '__summary__';
        return page.getByTestId('round').getAttribute('data-current-id').catch(() => null);
      },
      { timeout: 8000 },
    )
    .not.toBe(prevId);
}

async function enterRound(page: Page) {
  await page.goto(START);
  await page.getByTestId('level-1-play').click();
  await expect(page.getByTestId('intro')).toBeVisible();
  await page.getByTestId('intro-start').click();
  await expect(page.getByTestId('round')).toBeVisible();
}

test('new user completes a level-1 round, with one mistake that reappears', async ({ page }) => {
  await enterRound(page);

  const seen: string[] = [];
  let mistakenId = '';
  let madeMistake = false;

  for (let i = 0; i < 80; i++) {
    if (await summaryVisible(page)) break;
    const round = page.getByTestId('round');
    const currentId = await round.getAttribute('data-current-id');
    if (!currentId) break;
    seen.push(currentId);

    if (!madeMistake) {
      // Deliberately tap a wrong card to force the miss + re-queue.
      mistakenId = currentId;
      await page.locator('[data-testid="answer"][data-correct="false"]').first().click();
      madeMistake = true;
    } else {
      await page.locator('[data-testid="answer"][data-correct="true"]').first().click();
    }
    await waitAdvance(page, currentId);
  }

  await expect(page.getByTestId('summary')).toBeVisible();

  // The mistaken item must have come back around (appeared at least twice).
  const reappearances = seen.filter((id) => id === mistakenId).length;
  expect(reappearances, `mistaken item ${mistakenId} should reappear`).toBeGreaterThanOrEqual(2);

  const stars = Number(await page.getByTestId('summary').getAttribute('data-stars'));
  expect(stars).toBeGreaterThanOrEqual(1);
});

test('progress is preserved across a page refresh', async ({ page }) => {
  await enterRound(page);

  // Finish a round answering everything correctly.
  for (let i = 0; i < 80; i++) {
    if (await summaryVisible(page)) break;
    const round = page.getByTestId('round');
    const currentId = await round.getAttribute('data-current-id');
    if (!currentId) break;
    await page.locator('[data-testid="answer"][data-correct="true"]').first().click();
    await waitAdvance(page, currentId);
  }
  await expect(page.getByTestId('summary')).toBeVisible();
  await page.getByTestId('to-map').click();

  const station = page.getByTestId('level-1-station');
  await expect(station).toBeVisible();
  expect(Number(await station.getAttribute('data-rounds'))).toBeGreaterThanOrEqual(1);

  // Reload — persisted progress must still be there.
  await page.reload();
  const stationAfter = page.getByTestId('level-1-station');
  await expect(stationAfter).toBeVisible();
  expect(Number(await stationAfter.getAttribute('data-rounds'))).toBeGreaterThanOrEqual(1);
});
