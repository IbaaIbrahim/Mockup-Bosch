/**
 * Gates C1, C2, C3 — carrier label format validation (PDF §3.2.4 A).
 *
 * These tests are the contract. If Bosch holds up a label on stage and the app
 * behaves differently from what is asserted here, the bug is in the wiring, not
 * in the engine.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CARRIER_FORMATS,
  INVALID_FORMAT_MESSAGE,
  matchCarrier,
  normaliseTrackingId,
  successMessage,
  validateNewPattern,
  type CarrierFormat,
} from '../../src/engine/carrier-format';

describe('normaliseTrackingId', () => {
  it('strips ordinary whitespace', () => {
    expect(normaliseTrackingId(' JD0123 4567 89012345 ')).toBe(
      'JD0123456789012345',
    );
  });

  it('strips non-breaking spaces, zero-width characters and BOM', () => {
    expect(normaliseTrackingId('JD 0123456789​012345﻿')).toBe(
      'JD0123456789012345',
    );
  });

  it('strips control characters injected by hardware scanners', () => {
    expect(normaliseTrackingId('JD0123456789012345\r\n')).toBe(
      'JD0123456789012345',
    );
  });

  it('uppercases', () => {
    expect(normaliseTrackingId('1z999aa10123456784')).toBe('1Z999AA10123456784');
  });

  it('does not alter the carrier prefix or digits', () => {
    expect(normaliseTrackingId('TBA123456789012')).toBe('TBA123456789012');
  });
});

describe('matchCarrier — valid labels (gate C2)', () => {
  it.each([
    ['DHL', 'JD0123456789012345'],
    ['UPS', '1Z999AA10123456784'],
    ['Amazon', 'TBA123456789012'],
    ['GLS', '123456789012'],
  ])('detects %s from %s', (carrier, id) => {
    const result = matchCarrier(id);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.carrier).toBe(carrier);
      expect(result.trackingId).toBe(id);
    }
  });

  /**
   * The sample IDs in PDF §3.2.3.1 render with an embedded space. A naive
   * implementation rejects Bosch's own examples — this is the single most
   * likely silent failure in the whole app.
   */
  it("accepts the PDF's own sample IDs despite their rendering whitespace", () => {
    const dhl = matchCarrier('JD012345678 9012345');
    expect(dhl.valid).toBe(true);
    if (dhl.valid) expect(dhl.carrier).toBe('DHL');

    const ups = matchCarrier('1Z999AA1012 3456784');
    expect(ups.valid).toBe(true);
    if (ups.valid) expect(ups.carrier).toBe('UPS');
  });

  it('builds the confirmation string specified in §3.2.2.1', () => {
    expect(successMessage('JD0123456789012345', 'DHL')).toBe(
      'JD0123456789012345 from DHL has been successfully registered',
    );
  });
});

describe('matchCarrier — invalid labels (gate C1)', () => {
  it.each([
    ['arbitrary text', 'XYZ123'],
    ['empty', ''],
    ['whitespace only', '   '],
    ['DHL too short', 'JD012345678901234'],
    ['DHL too long', 'JD01234567890123456'],
    ['DHL with letters in the numeric part', 'JD01234567890123AB'],
    ['UPS wrong prefix', '2Z999AA10123456784'],
    ['UPS too short', '1Z999AA1012345678'],
    ['GLS 11 digits', '12345678901'],
    ['GLS 13 digits', '1234567890123'],
    ['Amazon wrong prefix', 'TBB123456789012'],
    ['Amazon too short', 'TBA12345678901'],
    ['a DPD-style label', '05123456789012345'],
  ])('rejects %s', (_label, input) => {
    expect(matchCarrier(input).valid).toBe(false);
  });

  /**
   * '7712 3456 7890' normalises to 12 digits, which is exactly Bosch's own
   * GLS pattern (^[0-9]{12}$, PDF §3.2.4 A). Any 12-digit string is
   * indistinguishable from a real GLS label under the specified regex, so
   * this is correctly classified as GLS rather than rejected.
   */
  it('classifies a 12-digit label as GLS even when it could be another carrier', () => {
    const result = matchCarrier('7712 3456 7890');
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.carrier).toBe('GLS');
  });

  it('exposes the exact operator-facing message from §3.2.2.1', () => {
    expect(INVALID_FORMAT_MESSAGE).toBe(
      'Invalid Format! Please scan a valid carrier label.',
    );
  });

  it('returns the normalised value so the UI can show what was read', () => {
    const result = matchCarrier(' xyz 123 ');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.normalised).toBe('XYZ123');
      expect(result.raw).toBe(' xyz 123 ');
    }
  });
});

describe('matchCarrier — patterns are data, not code (gate C3)', () => {
  it('honours an added carrier pattern', () => {
    const withDpd: CarrierFormat[] = [
      ...DEFAULT_CARRIER_FORMATS,
      { carrier: 'DPD', pattern: '^05[0-9]{12}$', priority: 100, isActive: true },
    ];
    const result = matchCarrier('05123456789012', withDpd);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.carrier).toBe('DPD');
  });

  it('ignores a deactivated pattern', () => {
    const disabled = DEFAULT_CARRIER_FORMATS.map((f) =>
      f.carrier === 'GLS' ? { ...f, isActive: false } : f,
    );
    expect(matchCarrier('123456789012', disabled).valid).toBe(false);
  });

  it('survives a malformed pattern instead of throwing', () => {
    const broken: CarrierFormat[] = [
      { carrier: 'Broken', pattern: '^[unclosed', priority: 1, isActive: true },
      ...DEFAULT_CARRIER_FORMATS,
    ];
    const result = matchCarrier('JD0123456789012345', broken);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.carrier).toBe('DHL');
  });

  it('resolves ties by ascending priority', () => {
    const shadowing: CarrierFormat[] = [
      { carrier: 'Wins', pattern: '^JD[0-9]{16}$', priority: 1, isActive: true },
      ...DEFAULT_CARRIER_FORMATS,
    ];
    const result = matchCarrier('JD0123456789012345', shadowing);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.carrier).toBe('Wins');
  });
});

describe('validateNewPattern — admin guard', () => {
  it('accepts a well-formed, non-conflicting pattern', () => {
    expect(validateNewPattern('^05[0-9]{12}$')).toEqual({ ok: true });
  });

  it('rejects an invalid regular expression', () => {
    const result = validateNewPattern('^[unclosed');
    expect(result.ok).toBe(false);
  });

  it('rejects an unanchored pattern that could partially match', () => {
    const result = validateNewPattern('JD[0-9]+');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/anchored/i);
  });

  it('rejects a pattern that would shadow an existing carrier', () => {
    const result = validateNewPattern('^[A-Z0-9]{18}$');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/belongs to/i);
  });
});

describe('the four specified patterns are mutually exclusive', () => {
  const samples = [
    'JD0123456789012345',
    '1Z999AA10123456784',
    'TBA123456789012',
    '123456789012',
  ];

  it('never lets two active patterns claim the same tracking ID', () => {
    for (const sample of samples) {
      const hits = DEFAULT_CARRIER_FORMATS.filter((f) =>
        new RegExp(f.pattern).test(sample),
      );
      expect(hits, `${sample} matched ${hits.length} patterns`).toHaveLength(1);
    }
  });

  it('produces the same result regardless of evaluation order', () => {
    const reversed = DEFAULT_CARRIER_FORMATS.slice().reverse();
    for (const sample of samples) {
      const a = matchCarrier(sample, DEFAULT_CARRIER_FORMATS);
      const b = matchCarrier(sample, reversed);
      expect(a).toEqual(b);
    }
  });
});
