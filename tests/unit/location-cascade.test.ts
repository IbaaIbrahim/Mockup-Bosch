/**
 * Gates C5, C8, C9 — the storage location proposal cascade (PDF §3.2.4 B.2).
 *
 * The worked traces below are the ones demonstrated on stage. If these pass,
 * the cascade beats in the demo script cannot surprise us.
 */

import { describe, expect, it } from 'vitest';
import {
  proposeLocation,
  shouldMarkOccupied,
} from '../../src/engine/location-cascade';
import type { StorageLocation } from '../../src/engine/types';
import { STORAGE_LOCATIONS } from '../../src/db/seed-data';

/** The seed state, per PDF §3.2.3.1 Table B plus our additions. */
const seeded = (): StorageLocation[] =>
  STORAGE_LOCATIONS.map((l) => ({ ...l }));

describe('Priority 1 — department rack (gate C5)', () => {
  it('proposes RACK-A-05 for MOE/LOG-A because A-04 is occupied', () => {
    const { result } = proposeLocation('MOE/LOG-A', seeded());
    expect(result?.location.locationId).toBe('RACK-A-05');
    expect(result?.priority).toBe(1);
  });

  it('never proposes an occupied rack', () => {
    const { result } = proposeLocation('MOE/LOG-A', seeded());
    expect(result?.location.isOccupied).toBe(false);
  });

  it('gives a reason suitable for the "Why this location?" affordance', () => {
    const { result } = proposeLocation('MOE/LOG-A', seeded());
    expect(result?.reason).toContain('MOE/LOG-A');
  });
});

describe('Priority 2 — general rack fallback (gate C8)', () => {
  /**
   * SAP PO 4500987655 → Bob Builder / MOE/ENG-2. Both ENG-2 racks are occupied
   * in the seed on purpose, so the cascade must fall through.
   */
  it('falls back to RACK-C-13 for MOE/ENG-2, whose racks are all full', () => {
    const { result } = proposeLocation('MOE/ENG-2', seeded());
    expect(result?.location.locationId).toBe('RACK-C-13');
    expect(result?.priority).toBe(2);
    expect(result?.location.assignedDepartment).toBeNull();
  });

  it('falls back to a general rack when no department is known', () => {
    const { result } = proposeLocation(null, seeded());
    expect(result?.location.locationId).toBe('RACK-C-13');
    expect(result?.priority).toBe(2);
  });

  it('falls back for a department that has no racks at all', () => {
    const { result } = proposeLocation('MOE/MFG-P', seeded());
    expect(result?.priority).toBe(2);
  });
});

describe('Priority 3 — transit trolley (gate C9)', () => {
  it('proposes TROLLEY-01 when every rack is occupied', () => {
    const full = seeded().map((l) =>
      l.locationType === 'RACK' ? { ...l, isOccupied: true } : l,
    );
    const { result } = proposeLocation('MOE/LOG-A', full);
    expect(result?.location.locationId).toBe('TROLLEY-01');
    expect(result?.priority).toBe(3);
  });

  it('proposes a trolley even for an unknown recipient when racks are full', () => {
    const full = seeded().map((l) =>
      l.locationType === 'RACK' ? { ...l, isOccupied: true } : l,
    );
    const { result } = proposeLocation(null, full);
    expect(result?.location.locationType).toBe('TROLLEY');
  });

  it('treats trolleys as available regardless of the occupancy flag', () => {
    const full = seeded().map((l) =>
      l.locationType === 'RACK' ? { ...l, isOccupied: true } : { ...l, isOccupied: true },
    );
    const { result } = proposeLocation('MOE/LOG-A', full);
    expect(result?.location.locationType).toBe('TROLLEY');
  });
});

describe('determinism', () => {
  it('returns the same proposal on repeated calls', () => {
    const a = proposeLocation('MOE/LOG-A', seeded()).result;
    const b = proposeLocation('MOE/LOG-A', seeded()).result;
    expect(a?.location.locationId).toBe(b?.location.locationId);
  });

  it('is unaffected by the input array order', () => {
    const forward = proposeLocation('MOE/LOG-A', seeded()).result;
    const backward = proposeLocation('MOE/LOG-A', seeded().reverse()).result;
    expect(forward?.location.locationId).toBe(backward?.location.locationId);
  });

  it('picks the lowest location ID among equally valid candidates', () => {
    const locations: StorageLocation[] = [
      { locationId: 'RACK-Z-99', locationType: 'RACK', assignedDepartment: 'X', isOccupied: false },
      { locationId: 'RACK-A-01', locationType: 'RACK', assignedDepartment: 'X', isOccupied: false },
    ];
    expect(proposeLocation('X', locations).result?.location.locationId).toBe(
      'RACK-A-01',
    );
  });
});

describe('rule trace', () => {
  it('records every priority that was evaluated', () => {
    const { trace } = proposeLocation('MOE/ENG-2', seeded());
    expect(trace.map((t) => t.priority)).toEqual([1, 2]);
    expect(trace[0]?.hit).toBeNull();
    expect(trace[1]?.hit).toBe('RACK-C-13');
  });

  it('records that Priority 1 was skipped when no department is known', () => {
    const { trace } = proposeLocation(null, seeded());
    expect(trace[0]?.note).toMatch(/skipped/i);
  });
});

describe('edge cases', () => {
  it('returns null when the location table is empty', () => {
    expect(proposeLocation('MOE/LOG-A', []).result).toBeNull();
  });

  it('returns null when there are no racks and no trolleys', () => {
    const staging: StorageLocation[] = [
      { locationId: 'S1', locationType: 'STAGING', assignedDepartment: null, isOccupied: false },
    ];
    expect(proposeLocation(null, staging).result).toBeNull();
  });

  it('treats an unrecognised department as no department', () => {
    const { result } = proposeLocation('MOE/DOES-NOT-EXIST', seeded());
    expect(result?.priority).toBe(2);
  });
});

describe('shouldMarkOccupied — deviation D9 (Q23)', () => {
  it('marks a rack occupied', () => {
    expect(shouldMarkOccupied({ locationType: 'RACK' })).toBe(true);
  });

  it('leaves a trolley available so Priority 3 keeps working', () => {
    expect(shouldMarkOccupied({ locationType: 'TROLLEY' })).toBe(false);
  });

  it('leaves a staging area available', () => {
    expect(shouldMarkOccupied({ locationType: 'STAGING' })).toBe(false);
  });

  it('marks everything occupied in literal mode, if Bosch prefers it', () => {
    expect(shouldMarkOccupied({ locationType: 'TROLLEY' }, true)).toBe(true);
  });
});
