/**
 * Shared domain types for the Bosch §3.2 demo.
 *
 * These mirror the schema in docs/05-DATA-MODEL.md §3. Keep them in sync with
 * the Drizzle schema — the Drizzle table definitions should be the source of
 * truth for persistence, and these types the source of truth for the engine.
 *
 * Nothing in src/engine/ may import from outside src/engine/. The engine is
 * pure: no database, no fetch, no framework, no Date.now() in decision paths.
 */

// ─── Storage ────────────────────────────────────────────────────────────────

export type LocationType = 'RACK' | 'TROLLEY' | 'STAGING';

/** docs/05-DATA-MODEL.md §3 — tbl_storage_locations */
export interface StorageLocation {
  /** The value physically encoded in the QR code on the rack/trolley. */
  locationId: string;
  locationType: LocationType;
  /** NULL = general-purpose, usable by any department. */
  assignedDepartment: string | null;
  isOccupied: boolean;
  /** Human label, e.g. "Rack A · Level 05". Display only. */
  displayName?: string;
}

// ─── Parcels ────────────────────────────────────────────────────────────────

export type ParcelStatus = 'STORED' | 'IN_TRANSIT' | 'DELIVERED';

/**
 * Where a record came from. Bosch §3.2.2.2 requires the dashboard to show data
 * from other plant logistics systems (e.g. milkruns), not only what the inbound
 * app writes — this column is how that distinction is made visible.
 */
export type SourceSystem = 'INBOUND_APP' | 'MILKRUN' | 'INTERNAL_TRANSFER';

/** docs/05-DATA-MODEL.md §3 — tbl_parcels */
export interface Parcel {
  trackingId: string;
  carrier: string;
  sapPoNumber: string | null;
  recipientName: string | null;
  recipientDepartment: string | null;
  recipientEmail: string | null;
  proposedLocation: string | null;
  actualLocation: string | null;
  status: ParcelStatus;
  sourceSystem: SourceSystem;
  /** ISO-8601 UTC. SQLite has no native timestamp type. */
  timestampLastEvent: string;
  createdAt: string;
}

// ─── Simulated external systems (docs/05-DATA-MODEL.md §4) ──────────────────

/** System A — SAP_ERP (PDF §3.2.3.2) */
export interface SapOrder {
  sapPoNumber: string;
  /** May be a person, a department, or null (§3.2.4 B.1). */
  recipientName: string | null;
  /** May be null (§3.2.4 B.1). */
  department: string | null;
  orderStatus: 'ACTIVE' | 'COMPLETED';
}

/** System B — Bosch_Active_Directory (PDF §3.2.3.2) */
export interface DirectoryUser {
  ntUserId: string;
  recipientName: string;
  emailAddress: string;
  department: string | null;
  /**
   * Alternate spellings that should resolve to this person.
   * The source document uses "Alice Wonder" in §3.1.3.3 and the tbl_parcels
   * sample, but "Alice Wonderland" in the Active Directory table. See
   * docs/08-QUESTIONS-FOR-BOSCH.md Q7.
   */
  aliases?: string[];
}
