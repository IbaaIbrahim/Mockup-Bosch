import { test, expect, nextButton } from './fixtures';

/**
 * The demo-example buttons are the stage path now — a broken one is a broken
 * presentation. This walks the exact sequence the presenter will tap: unhappy
 * value first, recover, happy value, at all three scan points.
 *
 * It also pins the two properties that keep the shortcuts honest: they only
 * fill the field (they never submit), and they are absent from the C10 hard
 * block, which still offers "Scan again" and nothing else.
 */

const TRACKING_PLACEHOLDER = 'e.g. JD0123456789012345';

test.describe('Demo example buttons', () => {
  test('each unhappy/happy pair fills its field and drives the real engine path', async ({ page }) => {
    await page.goto('/inbound');

    // ── Step 1: tracking number ──────────────────────────────────────────
    await page.getByRole('button', { name: 'Invalid label' }).click();
    await expect(page.getByPlaceholder(TRACKING_PLACEHOLDER)).toHaveValue('xyzsweg222');
    // Filling must not submit — the wash only appears after "Go".
    await expect(page.getByText('Invalid Format!')).toHaveCount(0);

    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('Invalid Format!')).toBeVisible();

    await page.getByRole('button', { name: 'Scan again' }).click();
    await page.getByRole('button', { name: 'Valid DHL label' }).click();
    await expect(page.getByPlaceholder(TRACKING_PLACEHOLDER)).toHaveValue('JD1234567890123456');
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('successfully registered')).toBeVisible();
    await nextButton(page).click();

    // ── Step 2: SAP PO ───────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByRole('button', { name: 'PO not in SAP' }).click();
    await expect(page.getByLabel('SAP PO number')).toHaveValue('1234567890');
    await nextButton(page).click();
    await expect(page.getByText('PO number not found in SAP.')).toBeVisible();

    await page.getByRole('button', { name: 'PO in SAP' }).click();
    await expect(page.getByLabel('SAP PO number')).toHaveValue('4500987654');
    await nextButton(page).click();
    await expect(page.getByText('RACK-A-05')).toBeVisible();
    await page.getByRole('button', { name: 'Scan Location', exact: true }).click();

    // ── Step 3: location QR ──────────────────────────────────────────────
    await page.getByRole('button', { name: 'Wrong location' }).click();
    await expect(page.getByPlaceholder('RACK-A-05')).toHaveValue('RACK-C-12');
    await page.getByRole('button', { name: 'Go', exact: true }).click();

    await expect(page.getByText('Wrong location!')).toBeVisible();
    // C10 is untouched: no shortcut, no nav, no way forward but rescanning.
    const buttons = await page.getByRole('button').allTextContents();
    expect(buttons.filter(Boolean)).toEqual(['Scan again']);
    await expect(page.getByRole('link')).toHaveCount(0);

    await page.getByRole('button', { name: 'Scan again' }).click();
    await page.getByRole('button', { name: 'Correct location' }).click();
    await expect(page.getByPlaceholder('RACK-A-05')).toHaveValue('RACK-A-05');
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('Location verified!')).toBeVisible();
  });
});
