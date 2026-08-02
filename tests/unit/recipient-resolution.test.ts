/**
 * Gates C4, C6, C7, C13, C14 — recipient resolution and the email trigger
 * (PDF §3.2.4 B.1 and §3.2.4 D).
 *
 * C7 and C14 are "nothing happens" gates. They are the easiest to get wrong and
 * the least visible when they are wrong, which is exactly why they are asserted
 * here in detail.
 */

import { describe, expect, it } from 'vitest';
import {
  decideEmail,
  findDirectoryUser,
  isUnknownRecipient,
  isValidSapPo,
  resolveFromName,
  resolveFromSap,
  sapPoProgress,
} from '../../src/engine/recipient-resolution';
import { DIRECTORY_USERS, SAP_ORDERS } from '../../src/db/seed-data';

const sap = (po: string) => SAP_ORDERS.find((o) => o.sapPoNumber === po)!;

describe('SAP PO validation (gate C4)', () => {
  it('accepts exactly 10 digits', () => {
    expect(isValidSapPo('4500987654')).toBe(true);
  });

  it.each([
    ['9 digits', '450098765'],
    ['11 digits', '45009876543'],
    ['contains letters', '450098765A'],
    ['empty', ''],
  ])('rejects %s', (_label, input) => {
    expect(isValidSapPo(input)).toBe(false);
  });

  it('reports progress so the disabled button can explain itself', () => {
    expect(sapPoProgress('450098765')).toEqual({ entered: 9, required: 10 });
    expect(sapPoProgress('4500987654')).toEqual({ entered: 10, required: 10 });
  });
});

describe('Active Directory lookup (gate C6)', () => {
  it('finds a user by their canonical name', () => {
    expect(findDirectoryUser('John Doe', DIRECTORY_USERS)?.ntUserId).toBe(
      'DOE2AN',
    );
  });

  it('is case-insensitive and tolerant of extra whitespace', () => {
    expect(
      findDirectoryUser('  john   doe ', DIRECTORY_USERS)?.ntUserId,
    ).toBe('DOE2AN');
  });

  /**
   * The source document uses "Alice Wonder" in §3.1.3.3 and the tbl_parcels
   * sample, but "Alice Wonderland" in the AD table. Both must resolve — see
   * docs/08-QUESTIONS-FOR-BOSCH.md Q7.
   */
  it('resolves both spellings of Alice to one person', () => {
    const a = findDirectoryUser('Alice Wonderland', DIRECTORY_USERS);
    const b = findDirectoryUser('Alice Wonder', DIRECTORY_USERS);
    expect(a?.ntUserId).toBe('WON5AN');
    expect(b?.ntUserId).toBe('WON5AN');
  });

  it('returns null for someone not in the directory', () => {
    expect(findDirectoryUser('Nobody At All', DIRECTORY_USERS)).toBeNull();
  });
});

describe('resolveFromSap — the PO path (gate C5 input)', () => {
  it('takes name and department from SAP and the email from AD', () => {
    const r = resolveFromSap(sap('4500987654'), DIRECTORY_USERS);
    expect(r.recipientName).toBe('John Doe');
    expect(r.department).toBe('MOE/LOG-A');
    expect(r.email).toBe('john.doe@bosch.com');
  });

  it('fills a null SAP department from Active Directory', () => {
    const r = resolveFromSap(sap('4500222333'), DIRECTORY_USERS);
    expect(r.department).toBe('MOE/LOG-A');
    expect(r.email).toBe('alice.w@bosch.com');
  });

  it('handles a SAP order with no recipient at all', () => {
    const r = resolveFromSap(sap('4500333444'), DIRECTORY_USERS);
    expect(r.recipientName).toBeNull();
    expect(r.email).toBeNull();
    expect(r.directoryQueried).toBe(false);
    // The department still came from SAP, so the cascade can use Priority 1.
    expect(r.department).toBe('MOE/LOG-A');
  });

  it('still resolves a COMPLETED order', () => {
    const r = resolveFromSap(sap('4500111222'), DIRECTORY_USERS);
    expect(r.recipientName).toBe('Sarah Connor');
  });
});

describe('resolveFromName — the manual path', () => {
  it('resolves a known name through the directory', () => {
    const r = resolveFromName('Alice Wonderland', DIRECTORY_USERS);
    expect(r.department).toBe('MOE/LOG-A');
    expect(r.email).toBe('alice.w@bosch.com');
    expect(r.directoryQueried).toBe(true);
  });

  it('keeps an unknown name but resolves no department or email', () => {
    const r = resolveFromName('Jane Nobody', DIRECTORY_USERS);
    expect(r.recipientName).toBe('Jane Nobody');
    expect(r.department).toBeNull();
    expect(r.email).toBeNull();
    expect(r.directoryQueried).toBe(true);
  });
});

describe('"Unknown" skips the directory entirely (gate C7)', () => {
  it('recognises the literal value', () => {
    expect(isUnknownRecipient('Unknown')).toBe(true);
    expect(isUnknownRecipient('unknown')).toBe(true);
    expect(isUnknownRecipient(' Unknown ')).toBe(true);
    expect(isUnknownRecipient('John Doe')).toBe(false);
  });

  /**
   * §3.2.4 B.1: "If the recipient's name is unknown, the system sets
   * ${v_recipient_name} and ${v_department} to NULL and no query to the
   * Bosch_Active_Directory is needed."
   *
   * The skipped query is observable in the ops console during the demo.
   */
  it('sets recipient and department to null and performs NO lookup', () => {
    const r = resolveFromName('Unknown', DIRECTORY_USERS);
    expect(r.recipientName).toBeNull();
    expect(r.department).toBeNull();
    expect(r.email).toBeNull();
    expect(r.directoryQueried).toBe(false);
    expect(r.source).toBe('UNKNOWN');
  });

  it('explains the skip in the trace, for the ops console', () => {
    const r = resolveFromName('Unknown', DIRECTORY_USERS);
    expect(r.trace).toMatch(/not queried/i);
  });
});

describe('email trigger — dispatch (gate C13)', () => {
  const base = {
    proposedLocation: 'RACK-A-05',
    actualLocation: 'RACK-A-05',
    recipientEmail: 'john.doe@bosch.com',
    trackingId: 'JD0123456789012345',
    carrier: 'DHL',
  };

  it('sends when the location is a rack and an email exists', () => {
    expect(decideEmail(base).send).toBe(true);
  });

  it('uses the exact subject from §3.2.4 D', () => {
    expect(decideEmail(base).subject).toBe(
      'Your parcel is ready for pickup at Goods Receipt',
    );
  });

  it('uses the exact body template from §3.2.4 D', () => {
    expect(decideEmail(base).body).toBe(
      'Your parcel with the tracking ID JD0123456789012345 from carrier DHL has been safely stored and is ready for pickup. Pickup Location: RACK-A-05',
    );
  });

  it('addresses the resolved recipient', () => {
    expect(decideEmail(base).to).toBe('john.doe@bosch.com');
  });
});

describe('email trigger — skip (gate C14)', () => {
  it('skips for a trolley, even when an email exists', () => {
    const d = decideEmail({
      proposedLocation: 'TROLLEY-01',
      actualLocation: 'TROLLEY-01',
      recipientEmail: 'john.doe@bosch.com',
      trackingId: 'JD0123456789012345',
      carrier: 'DHL',
    });
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/not a rack/i);
  });

  it('skips for a rack when no email is on file', () => {
    const d = decideEmail({
      proposedLocation: 'RACK-A-05',
      actualLocation: 'RACK-A-05',
      recipientEmail: null,
      trackingId: 'JD0123456789012345',
      carrier: 'DHL',
    });
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/no email/i);
  });

  it('skips for a staging area', () => {
    const d = decideEmail({
      proposedLocation: 'LINE_B_STAGING',
      actualLocation: 'LINE_B_STAGING',
      recipientEmail: 'john.doe@bosch.com',
      trackingId: 'MR-2026-07-08-001',
      carrier: 'Internal Milkrun',
    });
    expect(d.send).toBe(false);
  });

  it('gives a reason specific enough to narrate on stage', () => {
    const trolley = decideEmail({
      proposedLocation: 'TROLLEY-01',
      actualLocation: 'TROLLEY-01',
      recipientEmail: 'x@bosch.com',
      trackingId: 'T',
      carrier: 'DHL',
    });
    const noEmail = decideEmail({
      proposedLocation: 'RACK-A-05',
      actualLocation: 'RACK-A-05',
      recipientEmail: null,
      trackingId: 'T',
      carrier: 'DHL',
    });
    expect(trolley.reason).not.toBe(noEmail.reason);
  });
});
