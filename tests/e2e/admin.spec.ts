import { test, expect } from './fixtures';

test.describe('Ops console admin', () => {
  test('C3: an unsupported carrier label can be added live and immediately validates a rescan, well under 20 seconds', async ({ page }) => {
    const t0 = Date.now();

    await page.goto('/ops');
    await page.getByLabel('Carrier name').fill('DPD');
    await page.getByLabel('Pattern (anchored regex)').fill('^05[0-9]{12}$');
    await page.getByRole('button', { name: 'Add pattern' }).click();
    // exact:true — the live event feed also echoes the pattern inline in its reason text.
    await expect(page.getByText('^05[0-9]{12}$', { exact: true })).toBeVisible();

    await page.goto('/inbound');
    await page.getByPlaceholder('e.g. JD0123456789012345').fill('05123456789012');
    await page.getByRole('button', { name: 'Go', exact: true }).click();

    await expect(page.getByText('successfully registered')).toBeVisible();
    await expect(page.getByText('from DPD')).toBeVisible();

    expect(Date.now() - t0).toBeLessThan(20_000);
  });

  test('a pattern that would shadow an existing carrier is rejected with a clear reason', async ({ page }) => {
    await page.goto('/ops');
    await page.getByLabel('Carrier name').fill('Fake');
    await page.getByLabel('Pattern (anchored regex)').fill('^[A-Z0-9]{18}$'); // matches DHL's 18-char shape
    await page.getByRole('button', { name: 'Add pattern' }).click();

    await expect(page.getByText(/belongs to/i)).toBeVisible();
  });

  test('demo:reset restores the exact baseline counts', async ({ page, request }) => {
    await page.goto('/ops');
    await page.getByRole('button', { name: 'Reset demo data' }).click();
    await page.getByRole('button', { name: 'Confirm reset' }).click();
    await page.waitForTimeout(500);

    const health = await (await request.get('/api/ops/health')).json();
    expect(health.counts.parcels).toBe(125);
    expect(health.counts.storageLocations).toBe(13);
  });
});
