import { test as base, expect } from '@playwright/test';

/** Every gate test starts from the exact deterministic seed (risk R12). */
export const test = base.extend({
  // Playwright's fixture callback is conventionally named `use`, but that
  // identifier trips eslint's react-hooks rule (it pattern-matches any
  // function literally named `use`); `provide` sidesteps the false positive.
  page: async ({ page, request }, provide) => {
    await request.post('/api/admin/reset');
    await provide(page);
  },
});

export { expect };

/** Fill the manual-entry field under a Scanner and submit — every gate test uses the manual fallback (A2.20; camera is unavailable headless). */
export async function scanManually(page: import('@playwright/test').Page, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder).fill(value);
  await page.getByRole('button', { name: 'Go', exact: true }).click();
}

export const nextButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Next', exact: true });

/** Scans a tracking ID and advances past the success wash to the recipient-choice screen. */
export async function registerScan(page: import('@playwright/test').Page, trackingId: string) {
  await page.goto('/inbound');
  await scanManually(page, 'e.g. JD0123456789012345', trackingId);
  await expect(page.getByText('successfully registered')).toBeVisible();
  await nextButton(page).click();
  await expect(page.getByText('Does an active SAP PO number exist?')).toBeVisible();
}

