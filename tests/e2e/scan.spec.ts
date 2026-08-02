import { test, expect, scanManually } from './fixtures';

test.describe('Step 1 — scan & format validation', () => {
  test('C1: an unknown/malformed label is rejected, blocks, and allows rescan', async ({ page }) => {
    await page.goto('/inbound');
    await scanManually(page, 'e.g. JD0123456789012345', 'XYZ123');

    await expect(page.getByText('Invalid Format!')).toBeVisible();
    await expect(page.getByText('Please scan a valid carrier label.')).toBeVisible();
    // No way forward except rescanning — the only button on the wash itself
    // (scoped to .state-wash: the dev-mode Next.js indicator is also a <button>).
    const washButtons = page.locator('.state-wash').getByRole('button');
    await expect(washButtons).toHaveCount(1);
    await expect(washButtons).toHaveText('Scan again');

    await washButtons.click();
    await expect(page.getByPlaceholder('e.g. JD0123456789012345')).toBeVisible();
  });

  test("C2: a valid DHL label — including the PDF's own rendering whitespace — is auto-detected", async ({ page }) => {
    await page.goto('/inbound');
    // Same embedded-whitespace shape as the §3.2.3.1 sample ("JD012345678
    // 9012345"), but a tracking ID not already in the seed data — the exact
    // PDF sample IS one of the seeded verbatim rows, so scanning it here
    // would (correctly) hit the duplicate/amber path instead, which has its
    // own test below.
    await scanManually(page, 'e.g. JD0123456789012345', 'JD987654321 0123456');

    await expect(page.getByText('JD9876543210123456')).toBeVisible();
    await expect(page.getByText('from DHL — successfully registered.')).toBeVisible();
  });

  test('duplicate scan of an already-stored tracking ID shows the amber wash, not red or green', async ({ page }) => {
    await page.goto('/inbound');
    // Seeded verbatim in tbl_parcels, already STORED.
    await scanManually(page, 'e.g. JD0123456789012345', 'JD0123456789012345');

    await expect(page.getByText('Already registered')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register anyway' })).toBeVisible();
  });
});
