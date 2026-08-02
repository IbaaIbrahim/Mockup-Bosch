import { test, expect, registerScan, nextButton } from './fixtures';

/** Registers a scan through the SAP path (deterministic RACK-A-05) up to the Scan Location button. */
async function proceedToLocationScan(page: import('@playwright/test').Page, trackingId: string) {
  await registerScan(page, trackingId);
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await page.getByLabel('SAP PO number').fill('4500987654');
  await nextButton(page).click();
  await expect(page.getByText('RACK-A-05')).toBeVisible();
  await page.getByRole('button', { name: 'Scan Location', exact: true }).click();
  await expect(page.getByText('Scan the location QR code')).toBeVisible();
}

test.describe('Step 3 — location verification (the single most important interaction)', () => {
  test('C10: a wrong QR hard-blocks with expected vs scanned, and offers no way forward except rescanning', async ({ page }) => {
    await proceedToLocationScan(page, 'JD7777777777777777');

    await page.getByPlaceholder('RACK-A-05').fill('RACK-C-12');
    await page.getByRole('button', { name: 'Go', exact: true }).click();

    await expect(page.getByText('Wrong location!')).toBeVisible();
    await expect(page.getByText('Expected')).toBeVisible();
    await expect(page.getByText('RACK-A-05')).toBeVisible();
    await expect(page.getByText('Scanned')).toBeVisible();
    await expect(page.getByText('RACK-C-12')).toBeVisible();

    // No override, no skip, no back — "Scan again" is the only affordance.
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
    const buttons = await page.getByRole('button').allTextContents();
    expect(buttons.filter(Boolean)).toEqual(['Scan again']);
  });

  test('C11: the correct QR verifies and proceeds', async ({ page }) => {
    await proceedToLocationScan(page, 'JD8888888888888888');

    await page.getByPlaceholder('RACK-A-05').fill('RACK-A-05');
    await page.getByRole('button', { name: 'Go', exact: true }).click();

    await expect(page.getByText('Location verified!')).toBeVisible();
    await expect(page.getByText('You can now place the parcel in RACK-A-05.')).toBeVisible();
  });

  test('C12: an unrecognised QR value is rejected cleanly, and registering it live does not bypass the mismatch', async ({ page }) => {
    await proceedToLocationScan(page, 'JD9999999999999999');

    await page.getByPlaceholder('RACK-A-05').fill('SHELF-UNKNOWN-99');
    await page.getByRole('button', { name: 'Go', exact: true }).click();

    await expect(page.getByText('Unknown location code')).toBeVisible();
    await expect(page.getByText('SHELF-UNKNOWN-99', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Register this location (demo)' }).click();
    await page.getByRole('button', { name: 'Register & verify' }).click();

    // The scanned code is now a known location, but it still isn't the
    // proposed one — registering it must not silently unblock the operator.
    await expect(page.getByText('Wrong location!')).toBeVisible();
  });
});
