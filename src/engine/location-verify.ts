/**
 * Location QR verification.
 *
 * Implements PDF §3.2.2.1 Step 3 and §3.2.4 C.
 *
 *   IF (actual == proposed) THEN allow the booking to proceed
 *   IF (actual != proposed) THEN block the transaction and show the error
 *
 * "The process is blocked until the proposed location is scanned."
 *
 * This is implemented LITERALLY. There is no override, no skip, no "continue
 * anyway". The rigidity is the entire point of "error-proof" (§3.2.1) and the
 * wrong-scan drill is the strongest moment in the inbound app — see
 * docs/09-SCOPE-CONFERENCE-DEMO.md §8 Beat 4.
 *
 * Gates: C10, C11, C12
 */

/**
 * Normalise a scanned QR payload down to a location ID.
 *
 * We do not know what Bosch's physical QR codes encode — see
 * docs/08-QUESTIONS-FOR-BOSCH.md Q3. This handles the plausible shapes:
 *
 *   bare id     "RACK-A-05"
 *   lowercase   "rack-a-05"
 *   URL         "https://plant.bosch.com/loc/RACK-A-05"
 *   URL + query "https://plant.bosch.com/scan?location=RACK-A-05"
 *   JSON        '{"location_id":"RACK-A-05","type":"RACK"}'
 *   prefixed    "LOC:RACK-A-05"
 *
 * When `knownIds` is supplied, a final pass looks for any known ID as a
 * substring — the catch-all for an encoding we did not anticipate (risk R4b).
 */
export function normaliseLocationScan(
  raw: string,
  knownIds: readonly string[] = [],
): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';

  const candidates: string[] = [];

  // 1. JSON payload
  if (/^\s*[{[]/.test(trimmed)) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        for (const key of [
          'location_id',
          'locationId',
          'location',
          'id',
          'loc',
          'qr',
        ]) {
          const v = obj[key];
          if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
        }
      }
    } catch {
      // Not valid JSON despite the leading brace — fall through.
    }
  }

  // 2. URL — query parameter, then last path segment
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      for (const key of ['location', 'location_id', 'locationId', 'id', 'loc']) {
        const v = url.searchParams.get(key);
        if (v && v.trim()) candidates.push(v.trim());
      }
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last) candidates.push(decodeURIComponent(last));
    } catch {
      // Malformed URL — fall through.
    }
  }

  // 3. Prefixed form, e.g. "LOC:RACK-A-05"
  const prefixed = /^[A-Za-z_]{2,10}[:=]\s*(.+)$/.exec(trimmed);
  if (prefixed?.[1]) candidates.push(prefixed[1].trim());

  // 4. The raw value itself
  candidates.push(trimmed);

  const cleaned = candidates
    .map((c) => c.replace(/\s+/g, '').toUpperCase())
    .filter(Boolean);

  const known = knownIds.map((k) => k.toUpperCase());

  // Prefer a candidate that is exactly a known location.
  for (const c of cleaned) {
    if (known.includes(c)) return c;
  }

  // Then a candidate that contains a known location.
  for (const c of cleaned) {
    const hit = known.find((k) => c.includes(k));
    if (hit) return hit;
  }

  return cleaned[0] ?? '';
}

export type VerificationResult =
  | { status: 'MATCH'; scanned: string; expected: string; message: string }
  | { status: 'MISMATCH'; scanned: string; expected: string; message: string }
  | { status: 'UNKNOWN_LOCATION'; scanned: string; expected: string; message: string }
  | { status: 'EMPTY'; scanned: string; expected: string; message: string };

/**
 * Verify a scanned QR code against the proposed location.
 *
 * Operator-facing messages follow PDF §3.2.2.1 Step 3 verbatim.
 */
export function verifyLocation(
  expected: string,
  rawScan: string,
  knownIds: readonly string[] = [],
): VerificationResult {
  const scanned = normaliseLocationScan(rawScan, knownIds);
  const expectedNorm = expected.trim().toUpperCase();

  if (!scanned) {
    return {
      status: 'EMPTY',
      scanned,
      expected: expectedNorm,
      message: 'Nothing was scanned. Please try again.',
    };
  }

  if (scanned === expectedNorm) {
    return {
      status: 'MATCH',
      scanned,
      expected: expectedNorm,
      // PDF §3.2.2.1 Step 3, verbatim.
      message: `Location verified! You can now place the parcel in ${expectedNorm}.`,
    };
  }

  const isKnown = knownIds.some((k) => k.toUpperCase() === scanned);

  if (!isKnown) {
    return {
      status: 'UNKNOWN_LOCATION',
      scanned,
      expected: expectedNorm,
      message: `Unknown location code: ${scanned}. Please scan the QR-Code at ${expectedNorm}.`,
    };
  }

  return {
    status: 'MISMATCH',
    scanned,
    expected: expectedNorm,
    // PDF §3.2.2.1 Step 3, verbatim.
    message: `Wrong location! Expected: ${expectedNorm}. Scanned: ${scanned}. Please scan the correct QR-Code.`,
  };
}

/** The only status that may unblock the wizard. */
export function canProceed(result: VerificationResult): boolean {
  return result.status === 'MATCH';
}
