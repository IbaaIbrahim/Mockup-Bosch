import { test, expect, registerScan, nextButton } from './fixtures';

test.describe('Step 2 — recipient identification & location cascade', () => {
  test('C4: SAP PO Next stays disabled until exactly 10 digits, with a live counter', async ({ page }) => {
    await registerScan(page, 'JD1111111111111111');
    await page.getByRole('button', { name: 'Yes', exact: true }).click();

    const poField = page.getByLabel('SAP PO number');
    await poField.fill('450098765'); // 9 digits
    // exact:true — the button's disabledReason helper text also contains "9 / 10" inline.
    await expect(page.getByText('9 / 10', { exact: true })).toBeVisible();
    await expect(nextButton(page)).toBeDisabled();

    await poField.fill('4500987654'); // 10th digit
    await expect(nextButton(page)).toBeEnabled();
  });

  test('C5: PO 4500987654 resolves to John Doe / MOE/LOG-A and proposes RACK-A-05', async ({ page }) => {
    await registerScan(page, 'JD2222222222222222');
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByLabel('SAP PO number').fill('4500987654');
    await nextButton(page).click();

    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('MOE/LOG-A')).toBeVisible();
    await expect(page.getByText('RACK-A-05')).toBeVisible();
  });

  test('C6: manual name "Alice Wonderland" resolves via Active Directory to MOE/LOG-A', async ({ page }) => {
    await registerScan(page, 'JD3333333333333333');
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByLabel('Recipient name').fill('Alice Wonderland');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('Alice Wonderland')).toBeVisible();
    await expect(page.getByText('MOE/LOG-A')).toBeVisible();
  });

  test('C7: manual name "Unknown" performs no AD query and falls through to a general rack', async ({ page, request }) => {
    // Direct API timing is the precise version of this proof — a real AD
    // lookup carries ~250ms artificial adapter latency (src/adapters/latency.ts);
    // skipping it entirely resolves far faster. Measuring in the UI would
    // also include React rendering and an unrelated /propose round trip.
    const t0 = Date.now();
    await request.post('/api/inbound/directory', { data: { name: 'Unknown' } });
    expect(Date.now() - t0).toBeLessThan(200);

    await registerScan(page, 'JD4444444444444444');
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByRole('button', { name: 'Unknown', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('GO TO')).toBeVisible();
    await expect(page.getByText('N/A')).toBeVisible(); // recipient renders N/A when null
    await expect(page.getByText('RACK-C-13')).toBeVisible(); // no department -> general rack

    const opsRes = await page.request.get('/api/ops/events');
    const { events } = await opsRes.json();
    const skip = events.find((e: { kind: string; decision: string }) => e.kind === 'RECIPIENT_RESOLVED' && e.decision === 'SKIPPED');
    expect(skip.reason).toContain('Active Directory not queried');
  });

  test('C8: PO 4500987655 (Bob Builder / MOE/ENG-2) falls back to the general rack when both dept racks are occupied', async ({ page }) => {
    await registerScan(page, 'JD5555555555555555');
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByLabel('SAP PO number').fill('4500987655');
    await nextButton(page).click();

    await expect(page.getByText('Bob Builder')).toBeVisible();
    await expect(page.getByText('MOE/ENG-2')).toBeVisible();
    await expect(page.getByText('RACK-C-13')).toBeVisible();
  });

  test('C9: once every rack is occupied, the cascade proposes the transit trolley', async ({ page, request }) => {
    const locationsRes = await request.get('/api/admin/locations');
    const { locations } = await locationsRes.json();
    const racks = locations.filter((l: { locationType: string }) => l.locationType === 'RACK');

    for (const rack of racks) {
      await request.post('/api/inbound/finalize', {
        data: {
          trackingId: `FILL-${rack.locationId}`,
          carrier: 'DHL',
          sapPoNumber: null,
          recipientName: null,
          recipientDepartment: null,
          recipientEmail: null,
          proposedLocation: rack.locationId,
          actualLocation: rack.locationId,
        },
      });
    }

    await registerScan(page, 'JD6666666666666666');
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByRole('button', { name: 'Unknown', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('TROLLEY-01')).toBeVisible();
  });
});
