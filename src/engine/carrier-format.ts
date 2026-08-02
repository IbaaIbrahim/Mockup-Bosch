/**
 * Carrier tracking-number format validation.
 *
 * Implements PDF §3.2.4 A verbatim. This is one of the two "prove it isn't
 * hardcoded" moments in the demo — Bosch hold up labels we have never seen
 * (§3.2.2: "We will provide all required location QR-Codes and carrier labels
 * during the session").
 *
 * Patterns are DATA, not code. They live in the `carrier_formats` table so a
 * new carrier can be added live from the admin screen in ~15 seconds if an
 * unsupported label appears on stage (risk R3).
 *
 * Gates: C1, C2, C3 — docs/09-SCOPE-CONFERENCE-DEMO.md §5
 */

export interface CarrierFormat {
  carrier: string;
  /** Anchored regular expression source, e.g. '^JD[0-9]{16}$' */
  pattern: string;
  /**
   * Lower runs first. Irrelevant for the four specified patterns (they are
   * anchored and mutually exclusive), but it guarantees a pattern added live
   * on stage cannot shadow a specified one. New patterns default to 100+.
   */
  priority: number;
  isActive: boolean;
}

/** PDF §3.2.4 A — the four expressions, exactly as written. */
export const DEFAULT_CARRIER_FORMATS: readonly CarrierFormat[] = Object.freeze([
  { carrier: 'DHL', pattern: '^JD[0-9]{16}$', priority: 10, isActive: true },
  { carrier: 'UPS', pattern: '^1Z[A-Z0-9]{16}$', priority: 20, isActive: true },
  { carrier: 'Amazon', pattern: '^TBA[0-9]{12}$', priority: 30, isActive: true },
  { carrier: 'GLS', pattern: '^[0-9]{12}$', priority: 40, isActive: true },
]);

export type CarrierMatch =
  | {
      valid: true;
      carrier: string;
      /** The normalised value to persist as the primary key. */
      trackingId: string;
      raw: string;
    }
  | {
      valid: false;
      raw: string;
      normalised: string;
      /** Internal diagnostic. NOT shown to the operator. */
      reason: string;
    };

/**
 * The exact operator-facing message from PDF §3.2.2.1 Step 1. Do not reword —
 * where the source document specifies a string, we use it verbatim.
 */
export const INVALID_FORMAT_MESSAGE =
  'Invalid Format! Please scan a valid carrier label.';

/**
 * Build the success confirmation from PDF §3.2.2.1 Step 1:
 * "${v_tracking_id} from ${v_carrier} has been successfully registered"
 */
export function successMessage(trackingId: string, carrier: string): string {
  return `${trackingId} from ${carrier} has been successfully registered`;
}

/**
 * Characters a scanner or a copy-paste can inject that must be stripped.
 *
 * Must be a single character class ([...]) — joining these fragments with
 * plain alternation (|) outside brackets makes each "\uXXXX-\uYYYY" range
 * match only the literal 3-character sequence (start, hyphen, end) instead of
 * the intended code-point range, since `-` is only a range operator inside
 * a character class.
 */
const STRIP_CHARS = new RegExp(
  '[' +
    [
      '\\s', // all Unicode whitespace (space, tab, newline, NBSP via \s in JS)
      '\\u00A0', // no-break space
      '\\u200B-\\u200D', // zero-width space / non-joiner / joiner
      '\\uFEFF', // byte-order mark
      '\\u0000-\\u001F', // C0 control characters
      '\\u007F-\\u009F', // DEL and C1 control characters
    ].join('') +
    ']',
  'g',
);

/**
 * Normalise a raw scan before matching.
 *
 * Strips all whitespace (including non-breaking and zero-width characters that
 * barcode scanners and PDF copy-paste inject), removes control characters, and
 * uppercases.
 *
 * This matters: the sample IDs in PDF §3.2.3.1 render as "JD012345678 9012345"
 * and "1Z999AA1012 3456784". After normalisation they become
 * JD0123456789012345 (JD + 16 digits, valid DHL) and 1Z999AA10123456784
 * (1Z + 16 alphanumeric, valid UPS). A naive implementation rejects both of
 * Bosch's own examples.
 *
 * Deliberately does NOT strip the JD/TBA/1Z prefix or alter digits — those are
 * part of the pattern.
 */
export function normaliseTrackingId(raw: string): string {
  return raw.replace(STRIP_CHARS, '').toUpperCase();
}

/**
 * Match a scanned value against the active carrier formats.
 *
 * Returns the first match by ascending priority. Invalid input is a normal,
 * expected outcome — not an error. The operator rescans (§3.2.2.1: "The
 * operator must scan again until the format is valid").
 */
export function matchCarrier(
  raw: string,
  formats: readonly CarrierFormat[] = DEFAULT_CARRIER_FORMATS,
): CarrierMatch {
  const normalised = normaliseTrackingId(raw);

  if (normalised.length === 0) {
    return { valid: false, raw, normalised, reason: 'Empty scan' };
  }

  const active = formats
    .filter((f) => f.isActive)
    .slice()
    .sort((a, b) => a.priority - b.priority);

  for (const format of active) {
    let re: RegExp;
    try {
      re = new RegExp(format.pattern);
    } catch {
      // A malformed pattern added live must never crash the scanner.
      continue;
    }
    if (re.test(normalised)) {
      return {
        valid: true,
        carrier: format.carrier,
        trackingId: normalised,
        raw,
      };
    }
  }

  return {
    valid: false,
    raw,
    normalised,
    reason: `No active carrier pattern matched (${active.length} checked)`,
  };
}

/** Tracking IDs used to detect a newly added pattern shadowing a known carrier. */
const SHADOW_PROBES = [
  'JD0123456789012345',
  '1Z999AA10123456784',
  'TBA123456789012',
  '123456789012',
] as const;

/**
 * Guard for the admin "add carrier pattern" action (gate C3).
 *
 * Rejects a pattern that is unusable or that would shadow an existing carrier.
 * Called before persisting, so a mistake made live on stage fails safely
 * instead of breaking every subsequent scan.
 */
export function validateNewPattern(
  pattern: string,
  existing: readonly CarrierFormat[] = DEFAULT_CARRIER_FORMATS,
): { ok: true } | { ok: false; reason: string } {
  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch (e) {
    return { ok: false, reason: `Not a valid regular expression: ${String(e)}` };
  }

  if (!pattern.startsWith('^') || !pattern.endsWith('$')) {
    return {
      ok: false,
      reason:
        'Pattern must be fully anchored with ^ and $ to avoid partial matches',
    };
  }

  for (const probe of SHADOW_PROBES) {
    if (re.test(probe)) {
      const owner = matchCarrier(probe, existing);
      if (owner.valid) {
        return {
          ok: false,
          reason: `Pattern also matches ${probe}, which belongs to ${owner.carrier}`,
        };
      }
    }
  }

  return { ok: true };
}
