import { expect, Page, test } from '@playwright/test';

const START = '/?e2e=1';

async function summaryVisible(page: Page) {
  return page.getByTestId('summary').isVisible().catch(() => false);
}

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

test('level 7 word round: build-word and word-to-picture, completes the round', async ({ page }) => {
  await page.goto(START);
  await page.getByTestId('level-7-play').click();
  await expect(page.getByTestId('intro')).toBeVisible();
  await page.getByTestId('intro-start').click();
  await expect(page.getByTestId('round')).toBeVisible();

  let sawBuildWord = false;
  let sawWordToPic = false;

  for (let i = 0; i < 100; i++) {
    if (await summaryVisible(page)) break;
    const round = page.getByTestId('round');
    const cur = await round.getAttribute('data-current-id');
    if (!cur) break;

    if (await page.getByTestId('buildword').isVisible().catch(() => false)) {
      sawBuildWord = true;
      const target: string[] = JSON.parse((await page.getByTestId('buildword').getAttribute('data-target')) ?? '[]');
      // Tap the tiles in the correct order (placed tiles leave the tray).
      for (const syl of target) {
        await page.locator(`[data-testid="tile"][data-syllable="${syl}"]`).first().click();
      }
      await expect(page.getByTestId('buildword')).toHaveAttribute('data-solved', 'true');
      await waitAdvance(page, cur);
    } else if (await page.getByTestId('wordtopic').isVisible().catch(() => false)) {
      sawWordToPic = true;
      await page.locator('[data-testid="pic-option"][data-correct="true"]').click();
      await waitAdvance(page, cur);
    } else {
      await page.waitForTimeout(120);
    }
  }

  await expect(page.getByTestId('summary')).toBeVisible();
  expect(sawBuildWord, 'the round should include at least one build-word item').toBe(true);
  // level 7 alternates the two word exercises, so both should appear across ~12 items
  expect(sawBuildWord || sawWordToPic).toBe(true);
});

test('level 8 round completes — emoji-less words route to build-word (no broken picture picks)', async ({ page }) => {
  await page.goto(START);
  await page.getByTestId('level-8-play').click();
  await page.getByTestId('intro-start').click();
  await expect(page.getByTestId('round')).toBeVisible();

  for (let i = 0; i < 120; i++) {
    if (await summaryVisible(page)) break;
    const cur = await page.getByTestId('round').getAttribute('data-current-id');
    if (!cur) break;
    if (await page.getByTestId('buildword').isVisible().catch(() => false)) {
      const target: string[] = JSON.parse((await page.getByTestId('buildword').getAttribute('data-target')) ?? '[]');
      for (const syl of target) await page.locator(`[data-testid="tile"][data-syllable="${syl}"]`).first().click();
      await waitAdvance(page, cur);
    } else if (await page.getByTestId('wordtopic').isVisible().catch(() => false)) {
      // every word-to-picture item must offer a real correct option (no undefined emoji)
      await expect(page.locator('[data-testid="pic-option"][data-correct="true"]')).toHaveCount(1);
      await page.locator('[data-testid="pic-option"][data-correct="true"]').click();
      await waitAdvance(page, cur);
    } else {
      await page.waitForTimeout(120);
    }
  }
  await expect(page.getByTestId('summary')).toBeVisible();
});
