import { expect, Page, test } from '@playwright/test';

const START = '/?e2e=1';

async function readSummaryVisible(page: Page) {
  return page.getByTestId('read-summary').isVisible().catch(() => false);
}

test('full paragraph flow: parent approves each sentence, answers comprehension, finishes', async ({ page }) => {
  await page.goto(START);
  // Level 11 is a paragraph level → routes to the read-aloud screen.
  await page.getByTestId('level-11-play').click();

  const read = page.getByTestId('readaloud');
  await expect(read).toBeVisible();
  await expect(read).toHaveAttribute('data-mode', 'paragraph');

  let sawSentence = false;
  let sawComprehension = false;

  for (let i = 0; i < 40; i++) {
    if (await readSummaryVisible(page)) break;
    const step = await page.getByTestId('readaloud').getAttribute('data-step');

    if (await page.getByTestId('read-sentence').isVisible().catch(() => false)) {
      sawSentence = true;
      await page.getByTestId('mark-ok').click(); // parent approves the reading
    } else if (await page.getByTestId('comprehension').isVisible().catch(() => false)) {
      sawComprehension = true;
      await page.locator('[data-testid="comp-option"][data-correct="true"]').click();
    }
    // wait for the step to advance or the summary to show
    await expect
      .poll(async () => {
        if (await readSummaryVisible(page)) return '__done__';
        return page.getByTestId('readaloud').getAttribute('data-step').catch(() => null);
      }, { timeout: 8000 })
      .not.toBe(step);
  }

  expect(sawSentence, 'paragraph should present sentences to read aloud').toBe(true);
  expect(sawComprehension, 'paragraph should ask a comprehension question').toBe(true);
  await expect(page.getByTestId('read-summary')).toBeVisible();
  expect(Number(await page.getByTestId('read-summary').getAttribute('data-stars'))).toBeGreaterThanOrEqual(1);
});
