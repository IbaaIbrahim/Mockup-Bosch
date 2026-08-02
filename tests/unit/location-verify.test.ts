/**
 * Gates C10, C11, C12 — location QR verification (PDF §3.2.2.1 Step 3, §3.2.4 C).
 *
 * C10 is the strongest moment in the inbound app: the wrong scan must HARD
 * BLOCK with no override. These tests exist to guarantee no future refactor
 * quietly introduces an escape hatch.
 */

import { describe, expect, it } from 'vitest';
import {
  canProceed,
  normaliseLocationScan,
  verifyLocation,
} from '../../src/engine/location-verify';
import { STORAGE_LOCATIONS } from '../../src/db/seed-data';

const KNOWN = STORAGE_LOCATIONS.map((l) => l.locationId);

describe('normaliseLocationScan — unknown QR encodings (risk R4b)', () => {
  it('accepts a bare location ID', () => {
    expect(normaliseLocationScan('RACK-A-05', KNOWN)).toBe('RACK-A-05');
  });

  it('uppercases', () => {
    expect(normaliseLocationScan('rack-a-05', KNOWN)).toBe('RACK-A-05');
  });

  it('trims surrounding whitespace and newlines', () => {
    expect(normaliseLocationScan('  RACK-A-05\n', KNOWN)).toBe('RACK-A-05');
  });

  it('extracts from a URL path', () => {
    expect(
      normaliseLocationScan('https://plant.bosch.com/loc/RACK-A-05', KNOWN),
    ).toBe('RACK-A-05');
  });

  it('extracts from a URL query parameter', () => {
    expect(
      normaliseLocationScan(
        'https://plant.bosch.com/scan?location=RACK-A-05&src=qr',
        KNOWN,
      ),
    ).toBe('RACK-A-05');
  });

  it('extracts from a JSON payload', () => {
    expect(
      normaliseLocationScan('{"location_id":"RACK-A-05","type":"RACK"}', KNOWN),
    ).toBe('RACK-A-05');
  });

  it('extracts from a camelCase JSON key', () => {
    expect(normaliseLocationScan('{"locationId":"TROLLEY-01"}', KNOWN)).toBe(
      'TROLLEY-01',
    );
  });

  it('extracts from a prefixed form', () => {
    expect(normaliseLocationScan('LOC:RACK-A-05', KNOWN)).toBe('RACK-A-05');
  });

  it('finds a known ID embedded in an unanticipated wrapper', () => {
    expect(
      normaliseLocationScan('BOSCH|PLANT7|RACK-A-05|REV2', KNOWN),
    ).toBe('RACK-A-05');
  });

  it('returns the cleaned value when nothing is recognised', () => {
    expect(normaliseLocationScan('some other code', [])).toBe('SOMEOTHERCODE');
  });

  it('returns empty for an empty scan', () => {
    expect(normaliseLocationScan('   ', KNOWN)).toBe('');
  });
});

describe('verifyLocation — correct scan (gate C11)', () => {
  it('matches and allows the wizard to proceed', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-A-05', KNOWN);
    expect(result.status).toBe('MATCH');
    expect(canProceed(result)).toBe(true);
  });

  it('matches through a URL-encoded QR', () => {
    const result = verifyLocation(
      'RACK-A-05',
      'https://plant.bosch.com/loc/RACK-A-05',
      KNOWN,
    );
    expect(result.status).toBe('MATCH');
  });

  it('uses the exact confirmation string from §3.2.2.1 Step 3', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-A-05', KNOWN);
    expect(result.message).toBe(
      'Location verified! You can now place the parcel in RACK-A-05.',
    );
  });
});

describe('verifyLocation — wrong scan HARD BLOCKS (gate C10)', () => {
  it('reports a mismatch for a different known rack', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-C-12', KNOWN);
    expect(result.status).toBe('MISMATCH');
  });

  it('refuses to proceed', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-C-12', KNOWN);
    expect(canProceed(result)).toBe(false);
  });

  it('uses the exact error string from §3.2.2.1 Step 3, showing both values', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-C-12', KNOWN);
    expect(result.message).toBe(
      'Wrong location! Expected: RACK-A-05. Scanned: RACK-C-12. Please scan the correct QR-Code.',
    );
  });

  it('exposes expected and scanned separately so the UI can stack them', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-C-12', KNOWN);
    expect(result.expected).toBe('RACK-A-05');
    expect(result.scanned).toBe('RACK-C-12');
  });

  it('blocks a trolley scanned when a rack was proposed', () => {
    const result = verifyLocation('RACK-A-05', 'TROLLEY-01', KNOWN);
    expect(canProceed(result)).toBe(false);
  });

  /**
   * There is no override. §3.2.2.1: "The process is blocked until the proposed
   * location is scanned." Only MATCH may unblock — this test is the guard
   * against a future refactor adding an escape hatch.
   */
  it('allows only MATCH to unblock, for every possible status', () => {
    const statuses = [
      verifyLocation('RACK-A-05', 'RACK-C-12', KNOWN),
      verifyLocation('RACK-A-05', 'NOT-A-LOCATION', KNOWN),
      verifyLocation('RACK-A-05', '', KNOWN),
      verifyLocation('RACK-A-05', 'RACK-A-05', KNOWN),
    ];
    expect(statuses.filter(canProceed)).toHaveLength(1);
  });
});

describe('verifyLocation — unknown location (gate C12)', () => {
  it('distinguishes an unknown code from a known wrong one', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-Q-99', KNOWN);
    expect(result.status).toBe('UNKNOWN_LOCATION');
  });

  it('refuses to proceed on an unknown code', () => {
    expect(canProceed(verifyLocation('RACK-A-05', 'RACK-Q-99', KNOWN))).toBe(
      false,
    );
  });

  it('names the scanned code so the admin can register it live', () => {
    const result = verifyLocation('RACK-A-05', 'RACK-Q-99', KNOWN);
    expect(result.message).toContain('RACK-Q-99');
  });

  it('handles an empty scan without throwing', () => {
    const result = verifyLocation('RACK-A-05', '', KNOWN);
    expect(result.status).toBe('EMPTY');
    expect(canProceed(result)).toBe(false);
  });
});
