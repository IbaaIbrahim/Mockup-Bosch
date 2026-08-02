import { test, expect, registerScan, nextButton } from './fixtures';

test.describe('Step 4 — finalisation, email trigger, and completion', () => {
  test('C13/C15: RACK storage with a known email dispatches the exact notification and occupies the rack atomically', async ({ page, request }) => {
    const trackingId = 'JD1212121212121212';
    await registerScan(page, trackingId);
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByLabel('SAP PO number').fill('4500987654');
    await nextButton(page).click();
    await expect(page.getByText('RACK-A-05')).toBeVisible();
    await page.getByRole('button', { name: 'Scan Location', exact: true }).click();
    await page.getByPlaceholder('RACK-A-05').fill('RACK-A-05');
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('Location verified!')).toBeVisible();
    await nextButton(page).click();

    await expect(page.getByText('Process completed successfully.')).toBeVisible();
    await expect(page.getByText(trackingId)).toBeVisible();
    await expect(page.getByText('Sent to john.doe@bosch.com')).toBeVisible();

    // C15 — inserted, and the rack is now occupied for future cascades.
    const detail = await (await request.get(`/api/parcels/${trackingId}`)).json();
    expect(detail.parcel.status).toBe('STORED');
    expect(detail.parcel.actualLocation).toBe('RACK-A-05');

    const { locations } = await (await request.get('/api/admin/locations')).json();
    const rack = locations.find((l: { locationId: string }) => l.locationId === 'RACK-A-05');
    expect(rack.isOccupied).toBe(true);

    // C13 — the exact subject and body from PDF §3.2.4 D.
    const inbox = await (await request.get('/api/inbox')).json();
    const mail = inbox.emails.find((e: { context: { trackingId: string } }) => e.context?.trackingId === trackingId);
    expect(mail.subject).toBe('Your parcel is ready for pickup at Goods Receipt');
    expect(mail.body).toBe(
      `Your parcel with the tracking ID ${trackingId} from carrier DHL has been safely stored and is ready for pickup. Pickup Location: RACK-A-05`,
    );
    expect(mail.toAddress).toBe('john.doe@bosch.com');
  });

  test('C14: an unknown recipient sends no email, and the ops console logs why', async ({ page, request }) => {
    const trackingId = 'JD2323232323232323';
    await registerScan(page, trackingId);
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByRole('button', { name: 'Unknown', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Scan Location', exact: true }).click();

    const proposed = await page.getByPlaceholder(/^(RACK|TROLLEY)-/).getAttribute('placeholder');
    await page.getByPlaceholder(/^(RACK|TROLLEY)-/).fill(proposed!);
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('Location verified!')).toBeVisible();
    await nextButton(page).click();

    await expect(page.getByText('No notification')).toBeVisible();

    const inbox = await (await request.get('/api/inbox')).json();
    const mail = inbox.emails.find((e: { context: { trackingId: string } }) => e.context?.trackingId === trackingId);
    expect(mail).toBeUndefined();

    const { events } = await (await request.get('/api/ops/events')).json();
    const skip = events.find(
      (e: { kind: string; trackingId: string | null; decision: string }) =>
        e.kind === 'EMAIL_DECISION' && e.trackingId === trackingId && e.decision === 'SKIPPED',
    );
    expect(skip).toBeTruthy();
    expect(skip.reason).toContain('no email address on file');
  });

  test('C14 (trolley case): a TROLLEY storage sends no email even with a known recipient', async ({ page, request }) => {
    // Occupy every rack first so the cascade has nowhere left but the trolley.
    const { locations } = await (await request.get('/api/admin/locations')).json();
    for (const rack of locations.filter((l: { locationType: string }) => l.locationType === 'RACK')) {
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

    const trackingId = 'JD3434343434343434';
    await registerScan(page, trackingId);
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByLabel('SAP PO number').fill('4500987654'); // John Doe — has a known email
    await nextButton(page).click();
    await expect(page.getByText('TROLLEY-01')).toBeVisible();
    await page.getByRole('button', { name: 'Scan Location', exact: true }).click();
    await page.getByPlaceholder('TROLLEY-01').fill('TROLLEY-01');
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await nextButton(page).click();

    await expect(page.getByText('No notification')).toBeVisible();

    const inbox = await (await request.get('/api/inbox')).json();
    expect(inbox.emails.find((e: { context: { trackingId: string } }) => e.context?.trackingId === trackingId)).toBeUndefined();

    // Trolleys never get marked occupied (deviation D9) — the fallback stays available.
    const { locations: after } = await (await request.get('/api/admin/locations')).json();
    const trolley = after.find((l: { locationId: string }) => l.locationId === 'TROLLEY-01');
    expect(trolley.isOccupied).toBe(false);
  });
});
