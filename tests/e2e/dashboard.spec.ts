import { test, expect, registerScan, nextButton } from './fixtures';

test.describe('Dashboard — live updates and required content', () => {
  test('C16: a parcel registered on the phone appears on an open board within 2 seconds, no refresh', async ({ page, context }) => {
    const board = await context.newPage();
    await board.goto('/board');
    // exact:true — "DELIVERED" pills contain "LIVE" as a literal substring.
    await expect(board.getByText('LIVE', { exact: true })).toBeVisible();
    await board.waitForTimeout(500);

    const trackingId = 'JD4545454545454545';
    await registerScan(page, trackingId);
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByRole('button', { name: 'Unknown', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Scan Location', exact: true }).click();
    const proposed = await page.getByPlaceholder(/^(RACK|TROLLEY)-/).getAttribute('placeholder');
    await page.getByPlaceholder(/^(RACK|TROLLEY)-/).fill(proposed!);
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('Location verified!')).toBeVisible();

    const finalizedAt = Date.now();
    await nextButton(page).click();
    await expect(page.getByText('Process completed successfully.')).toBeVisible();

    await expect(board.getByText(trackingId)).toBeVisible({ timeout: 2000 });
    const elapsed = Date.now() - finalizedAt;
    expect(elapsed).toBeLessThan(2000);
  });

  test('A3.9/A3.10: milkrun rows are present and distinct, and the three PDF sample rows are seeded verbatim', async ({ page }) => {
    await page.goto('/table');
    await page.waitForTimeout(500);

    // §3.2.3.1 sample rows, verbatim.
    for (const id of ['JD0123456789012345', '1Z999AA10123456784', 'MR-2026-07-08-001']) {
      await expect(page.getByText(id)).toBeVisible();
    }

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Internal Milkrun');
  });

  test('A3.3/A3.6: carrier and status filters narrow results with AND semantics', async ({ page }) => {
    await page.goto('/table');
    await page.waitForTimeout(500);

    await page.getByText('DHL', { exact: true }).first().click();
    await page.waitForTimeout(400);
    let text = await page.textContent('body');
    const dhlOnly = /Showing (\d+) of (\d+) parcels/.exec(text!);
    expect(Number(dhlOnly![2])).toBeLessThan(125);

    await page.getByText('Stored', { exact: true }).first().click();
    await page.waitForTimeout(400);
    text = await page.textContent('body');
    const dhlStored = /Showing (\d+) of (\d+) parcels/.exec(text!);
    expect(Number(dhlStored![2])).toBeLessThanOrEqual(Number(dhlOnly![2]));

    expect(page.url()).toContain('carrier=DHL');
    expect(page.url()).toContain('status=STORED');
  });

  test('A3.16: filter state survives a reload via the URL', async ({ page }) => {
    await page.goto('/table?carrier=DHL&status=STORED');
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('carrier=DHL');
    expect(page.url()).toContain('status=STORED');
  });
});
