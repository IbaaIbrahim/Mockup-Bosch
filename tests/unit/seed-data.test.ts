/**
 * Seed integrity.
 *
 * Bosch will recognise their own data. Every row taken from the source PDF must
 * match it exactly — these tests are the guard against a well-meaning edit
 * quietly changing a value they can check.
 */

import { describe, expect, it } from 'vitest';
import {
  DIRECTORY_USERS,
  SAP_ORDERS,
  STORAGE_LOCATIONS,
  VERBATIM_PARCELS,
  buildParcelSeed,
  generateParcels,
} from '../../src/db/seed-data';
import { matchCarrier } from '../../src/engine/carrier-format';

describe('PDF §3.2.3.1 Table B — storage locations, verbatim', () => {
  const byId = (id: string) =>
    STORAGE_LOCATIONS.find((l) => l.locationId === id)!;

  it.each([
    ['RACK-A-04', 'RACK', 'MOE/LOG-A', true],
    ['RACK-A-05', 'RACK', 'MOE/LOG-A', false],
    ['RACK-C-12', 'RACK', null, true],
    ['RACK-C-13', 'RACK', null, false],
    ['TROLLEY-01', 'TROLLEY', null, false],
  ])('%s is %s / %s / occupied=%s', (id, type, dept, occupied) => {
    const l = byId(id);
    expect(l).toBeDefined();
    expect(l.locationType).toBe(type);
    expect(l.assignedDepartment).toBe(dept);
    expect(l.isOccupied).toBe(occupied);
  });

  it('has unique location IDs', () => {
    const ids = STORAGE_LOCATIONS.map((l) => l.locationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps both MOE/ENG-2 racks occupied so gate C8 is reachable', () => {
    const eng2 = STORAGE_LOCATIONS.filter(
      (l) => l.assignedDepartment === 'MOE/ENG-2',
    );
    expect(eng2.length).toBeGreaterThan(0);
    expect(eng2.every((l) => l.isOccupied)).toBe(true);
  });

  it('keeps at least one general rack vacant so Priority 2 can resolve', () => {
    expect(
      STORAGE_LOCATIONS.some(
        (l) =>
          l.locationType === 'RACK' &&
          l.assignedDepartment === null &&
          !l.isOccupied,
      ),
    ).toBe(true);
  });
});

describe('PDF §3.2.3.2 System A — SAP_ERP, verbatim', () => {
  it.each([
    ['4500987654', 'John Doe', 'MOE/LOG-A', 'ACTIVE'],
    ['4500987655', 'Bob Builder', 'MOE/ENG-2', 'ACTIVE'],
    ['4500111222', 'Sarah Connor', 'MOE/MFG-P', 'COMPLETED'],
  ])('%s → %s / %s / %s', (po, name, dept, status) => {
    const o = SAP_ORDERS.find((x) => x.sapPoNumber === po)!;
    expect(o).toBeDefined();
    expect(o.recipientName).toBe(name);
    expect(o.department).toBe(dept);
    expect(o.orderStatus).toBe(status);
  });

  it('includes a null-department order to exercise §3.2.4 B.1', () => {
    expect(SAP_ORDERS.some((o) => o.department === null)).toBe(true);
  });

  it('includes a null-recipient order to exercise §3.2.4 B.1', () => {
    expect(SAP_ORDERS.some((o) => o.recipientName === null)).toBe(true);
  });

  it('has 10-digit PO numbers throughout', () => {
    for (const o of SAP_ORDERS) {
      expect(o.sapPoNumber).toMatch(/^[0-9]{10}$/);
    }
  });
});

describe('PDF §3.2.3.2 System B — Active Directory, verbatim', () => {
  it.each([
    ['DOE2AN', 'John Doe', 'john.doe@bosch.com', 'MOE/LOG-A'],
    ['BUI4AN', 'Bob Builder', 'bob.builder@bosch.com', 'MOE/ENG-2'],
    ['CON1AN', 'Sarah Connor', 'sarah.connor@bosch.com', 'MOE/MFG-P'],
    ['WON5AN', 'Alice Wonderland', 'alice.w@bosch.com', 'MOE/LOG-A'],
  ])('%s → %s / %s / %s', (nt, name, email, dept) => {
    const u = DIRECTORY_USERS.find((x) => x.ntUserId === nt)!;
    expect(u).toBeDefined();
    expect(u.recipientName).toBe(name);
    expect(u.emailAddress).toBe(email);
    expect(u.department).toBe(dept);
  });

  it('carries the "Alice Wonder" alias (Q7)', () => {
    const alice = DIRECTORY_USERS.find((u) => u.ntUserId === 'WON5AN')!;
    expect(alice.aliases).toContain('Alice Wonder');
  });
});

describe('PDF §3.2.3.1 — the three sample parcels, verbatim', () => {
  it('seeds all three tracking IDs', () => {
    expect(VERBATIM_PARCELS.map((p) => p.trackingId)).toEqual([
      'JD0123456789012345',
      '1Z999AA10123456784',
      'MR-2026-07-08-001',
    ]);
  });

  it('preserves their exact timestamps', () => {
    expect(VERBATIM_PARCELS[0]!.timestampLastEvent).toBe(
      '2026-07-06T08:12:00.000Z',
    );
    expect(VERBATIM_PARCELS[1]!.timestampLastEvent).toBe(
      '2026-07-06T09:30:15.000Z',
    );
    expect(VERBATIM_PARCELS[2]!.timestampLastEvent).toBe(
      '2026-07-06T10:05:00.000Z',
    );
  });

  it('preserves the milkrun row exactly as specified', () => {
    const mr = VERBATIM_PARCELS[2]!;
    expect(mr.carrier).toBe('Internal Milkrun');
    expect(mr.sapPoNumber).toBeNull();
    expect(mr.recipientName).toBeNull();
    expect(mr.proposedLocation).toBeNull();
    expect(mr.actualLocation).toBe('LINE_B_STAGING');
    expect(mr.status).toBe('IN_TRANSIT');
  });
});

describe('generated dataset', () => {
  const reference = new Date('2026-07-29T12:00:00.000Z');

  it('is deterministic for a given seed', () => {
    const a = generateParcels({ referenceDate: reference, seed: 1 });
    const b = generateParcels({ referenceDate: reference, seed: 1 });
    expect(a.map((p) => p.trackingId)).toEqual(b.map((p) => p.trackingId));
  });

  it('differs for a different seed', () => {
    const a = generateParcels({ referenceDate: reference, seed: 1 });
    const b = generateParcels({ referenceDate: reference, seed: 2 });
    expect(a.map((p) => p.trackingId)).not.toEqual(b.map((p) => p.trackingId));
  });

  /**
   * PDF §3.2.2.2 requires the dashboard to include data from other plant
   * logistics systems, not only what the inbound app writes. This is the
   * easiest requirement in the brief to overlook.
   */
  it('includes internal milkrun rows', () => {
    const parcels = generateParcels({ referenceDate: reference });
    const milkruns = parcels.filter((p) => p.sourceSystem === 'MILKRUN');
    expect(milkruns.length).toBeGreaterThanOrEqual(30);
    expect(milkruns.some((p) => p.status === 'IN_TRANSIT')).toBe(true);
  });

  it('includes internal transfers', () => {
    const parcels = generateParcels({ referenceDate: reference });
    expect(
      parcels.some((p) => p.sourceSystem === 'INTERNAL_TRANSFER'),
    ).toBe(true);
  });

  it('generates carrier tracking IDs that pass real validation', () => {
    const parcels = generateParcels({ referenceDate: reference });
    const carrierParcels = parcels.filter((p) =>
      ['DHL', 'UPS', 'GLS', 'Amazon'].includes(p.carrier),
    );
    expect(carrierParcels.length).toBeGreaterThan(0);
    for (const p of carrierParcels) {
      const m = matchCarrier(p.trackingId);
      expect(m.valid, `${p.trackingId} (${p.carrier}) failed validation`).toBe(
        true,
      );
      if (m.valid) expect(m.carrier).toBe(p.carrier);
    }
  });

  it('always has arrivals today so the KPI is never zero', () => {
    const parcels = generateParcels({ referenceDate: reference });
    const today = reference.toISOString().slice(0, 10);
    expect(
      parcels.filter((p) => p.timestampLastEvent.startsWith(today)).length,
    ).toBeGreaterThan(0);
  });

  it('has an aged parcel to drive the >24h pickup alert', () => {
    const parcels = generateParcels({ referenceDate: reference });
    const cutoff = reference.getTime() - 24 * 60 * 60 * 1000;
    expect(
      parcels.some(
        (p) =>
          p.status === 'STORED' &&
          new Date(p.timestampLastEvent).getTime() < cutoff,
      ),
    ).toBe(true);
  });

  it('covers all four carriers plus internal sources', () => {
    const parcels = generateParcels({ referenceDate: reference });
    const carriers = new Set(parcels.map((p) => p.carrier));
    for (const c of ['DHL', 'UPS', 'GLS', 'Amazon', 'Internal Milkrun']) {
      expect(carriers.has(c), `missing carrier ${c}`).toBe(true);
    }
  });
});

describe('buildParcelSeed', () => {
  it('puts the verbatim PDF rows first', () => {
    const seed = buildParcelSeed({ referenceDate: new Date('2026-07-29') });
    expect(seed.slice(0, 3).map((p) => p.trackingId)).toEqual(
      VERBATIM_PARCELS.map((p) => p.trackingId),
    );
  });

  it('produces unique tracking IDs — it is the primary key', () => {
    const seed = buildParcelSeed({ referenceDate: new Date('2026-07-29') });
    const ids = seed.map((p) => p.trackingId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces roughly the documented volume', () => {
    const seed = buildParcelSeed({ referenceDate: new Date('2026-07-29') });
    expect(seed.length).toBeGreaterThan(100);
    expect(seed.length).toBeLessThan(150);
  });
});
