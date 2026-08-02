/**
 * Storage location proposal cascade.
 *
 * Implements PDF §3.2.4 B.2 — a prioritised cascade applied identically to the
 * SAP and non-SAP paths:
 *
 *   Priority 1  Department rack   — vacant RACK whose assigned_department
 *                                   matches the recipient's department
 *   Priority 2  General rack      — vacant RACK with no assigned department
 *   Priority 3  Transit trolley   — the default transit trolley
 *
 * "The first location found in this sequence is set as ${v_proposed_location}."
 *
 * Results are DETERMINISTIC (ordered by locationId) so the demo behaves
 * identically across rehearsals — a non-deterministic proposal makes the
 * wrong-QR drill impossible to script (risk R12).
 *
 * Gates: C5, C8, C9 — docs/09-SCOPE-CONFERENCE-DEMO.md §5
 */

import type { StorageLocation } from './types';

export type CascadePriority = 1 | 2 | 3;

export interface CascadeResult {
  location: StorageLocation;
  priority: CascadePriority;
  /**
   * Plain-language explanation, surfaced by the "Why this location?" affordance
   * on the proposal screen. Transparency reads as sophistication and costs one
   * component.
   */
  reason: string;
}

export interface CascadeTraceStep {
  priority: CascadePriority;
  label: string;
  considered: number;
  hit: string | null;
  note: string;
}

export interface CascadeOutcome {
  result: CascadeResult | null;
  /** Ordered rule trace, rendered in the ops console. */
  trace: CascadeTraceStep[];
}

/** Stable ordering — never rely on array insertion order from the database. */
function byId(a: StorageLocation, b: StorageLocation): number {
  return a.locationId.localeCompare(b.locationId);
}

/**
 * Propose a storage location for a parcel.
 *
 * @param department  The recipient's department, or null when unknown. Null is
 *                    a normal case, not an error: PDF §3.2.4 B.1 sets both
 *                    recipient and department to NULL when the operator enters
 *                    "Unknown", and SAP may return a null department.
 * @param locations   Current state of tbl_storage_locations.
 */
export function proposeLocation(
  department: string | null,
  locations: readonly StorageLocation[],
): CascadeOutcome {
  const trace: CascadeTraceStep[] = [];
  const sorted = locations.slice().sort(byId);

  // ── Priority 1 — department rack ──────────────────────────────────────────
  const deptCandidates = department
    ? sorted.filter(
        (l) =>
          l.locationType === 'RACK' &&
          l.assignedDepartment === department &&
          !l.isOccupied,
      )
    : [];

  trace.push({
    priority: 1,
    label: 'Department rack',
    considered: department
      ? sorted.filter(
          (l) => l.locationType === 'RACK' && l.assignedDepartment === department,
        ).length
      : 0,
    hit: deptCandidates[0]?.locationId ?? null,
    note: department
      ? deptCandidates.length > 0
        ? `Vacant rack assigned to ${department}`
        : `No vacant rack assigned to ${department}`
      : 'Skipped — no department known for this recipient',
  });

  if (deptCandidates[0]) {
    return {
      result: {
        location: deptCandidates[0],
        priority: 1,
        reason: `Assigned to ${department} and currently free.`,
      },
      trace,
    };
  }

  // ── Priority 2 — general rack (fallback) ──────────────────────────────────
  const generalCandidates = sorted.filter(
    (l) =>
      l.locationType === 'RACK' &&
      l.assignedDepartment === null &&
      !l.isOccupied,
  );

  trace.push({
    priority: 2,
    label: 'General rack',
    considered: sorted.filter(
      (l) => l.locationType === 'RACK' && l.assignedDepartment === null,
    ).length,
    hit: generalCandidates[0]?.locationId ?? null,
    note:
      generalCandidates.length > 0
        ? 'Vacant general-purpose rack'
        : 'No vacant general-purpose rack',
  });

  if (generalCandidates[0]) {
    return {
      result: {
        location: generalCandidates[0],
        priority: 2,
        reason: department
          ? `No free rack for ${department}, so a general rack was chosen.`
          : 'No department known, so a general rack was chosen.',
      },
      trace,
    };
  }

  // ── Priority 3 — transit trolley (final fallback) ─────────────────────────
  // Trolleys are eligible regardless of isOccupied: a trolley carries many
  // items in transit, and PDF §3.2.3.1 annotates TROLLEY-01 as "Always
  // available for transit". See docs/03-APP2-INBOUND.md §7, deviation D9.
  const trolleys = sorted.filter((l) => l.locationType === 'TROLLEY');

  trace.push({
    priority: 3,
    label: 'Transit trolley',
    considered: trolleys.length,
    hit: trolleys[0]?.locationId ?? null,
    note:
      trolleys.length > 0
        ? 'Always available for transit'
        : 'No trolley configured — cascade exhausted',
  });

  if (trolleys[0]) {
    return {
      result: {
        location: trolleys[0],
        priority: 3,
        reason: 'All racks are occupied, so the parcel goes to a transit trolley.',
      },
      trace,
    };
  }

  // Only reachable with a misconfigured location table. Never on a seeded demo.
  return { result: null, trace };
}

/**
 * Whether storing at this location should set is_occupied = TRUE.
 *
 * PDF §3.2.4 D states the UPDATE unconditionally, but §3.2.3.1 annotates
 * TROLLEY-01 as "Always available for transit". Applied literally, the first
 * trolley storage would mark it occupied and Priority 3 would have nothing left
 * to propose. We apply the flag to racks only — the smallest change that keeps
 * both statements in the source document true.
 *
 * See docs/08-QUESTIONS-FOR-BOSCH.md Q23. Set BOSCH_LITERAL_OCCUPANCY=true to
 * revert to the literal reading if Bosch prefers it.
 */
export function shouldMarkOccupied(
  location: Pick<StorageLocation, 'locationType'>,
  literalMode = false,
): boolean {
  if (literalMode) return true;
  return location.locationType === 'RACK';
}
