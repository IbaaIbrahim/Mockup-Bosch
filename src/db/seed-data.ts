/**
 * Seed fixtures for the Bosch §3.2 demo.
 *
 * Rows taken from the source PDF are reproduced VERBATIM and marked. Bosch will
 * recognise their own data — every value they can check must match.
 *
 * `npm run demo:reset` truncates and reseeds from this file. Run it between
 * every rehearsal and immediately before going on stage (risk R12): the demo
 * must behave identically every time, or the wrong-QR drill cannot be scripted.
 *
 * See docs/05-DATA-MODEL.md §6.
 */

import type {
  DirectoryUser,
  Parcel,
  ParcelStatus,
  SapOrder,
  SourceSystem,
  StorageLocation,
} from '../engine/types';
import { DEFAULT_CARRIER_FORMATS } from '../engine/carrier-format';

export const CARRIER_FORMATS = DEFAULT_CARRIER_FORMATS;

// ─── Storage locations ──────────────────────────────────────────────────────
// PDF §3.2.3.1 Table B, verbatim, plus additions that make the cascade
// fallbacks reachable without contriving anything.

export const STORAGE_LOCATIONS: StorageLocation[] = [
  // ── Verbatim from PDF §3.2.3.1 Table B ──
  {
    locationId: 'RACK-A-04',
    locationType: 'RACK',
    assignedDepartment: 'MOE/LOG-A',
    isOccupied: true,
    displayName: 'Rack A · Level 04',
  },
  {
    locationId: 'RACK-A-05',
    locationType: 'RACK',
    assignedDepartment: 'MOE/LOG-A',
    isOccupied: false, // "Vacant, ready to be proposed"
    displayName: 'Rack A · Level 05',
  },
  {
    locationId: 'RACK-C-12',
    locationType: 'RACK',
    assignedDepartment: null,
    isOccupied: true,
    displayName: 'Rack C · Level 12',
  },
  {
    locationId: 'RACK-C-13',
    locationType: 'RACK',
    assignedDepartment: null,
    isOccupied: false, // "Vacant general rack"
    displayName: 'Rack C · Level 13',
  },
  {
    locationId: 'TROLLEY-01',
    locationType: 'TROLLEY',
    assignedDepartment: null,
    isOccupied: false, // "Always available for transit"
    displayName: 'Transit Trolley 01',
  },

  // ── Added ──
  {
    locationId: 'RACK-A-06',
    locationType: 'RACK',
    assignedDepartment: 'MOE/LOG-A',
    isOccupied: false,
    displayName: 'Rack A · Level 06',
  },
  // B-01 and B-02 are BOTH occupied on purpose: SAP PO 4500987655 resolves to
  // Bob Builder / MOE/ENG-2, which then has no vacant department rack and must
  // fall through to Priority 2. That is how gate C8 is demonstrated without
  // contriving anything on stage.
  {
    locationId: 'RACK-B-01',
    locationType: 'RACK',
    assignedDepartment: 'MOE/ENG-2',
    isOccupied: true,
    displayName: 'Rack B · Level 01',
  },
  {
    locationId: 'RACK-B-02',
    locationType: 'RACK',
    assignedDepartment: 'MOE/ENG-2',
    isOccupied: true,
    displayName: 'Rack B · Level 02',
  },
  {
    locationId: 'RACK-C-14',
    locationType: 'RACK',
    assignedDepartment: null,
    isOccupied: false,
    displayName: 'Rack C · Level 14',
  },
  {
    locationId: 'TROLLEY-02',
    locationType: 'TROLLEY',
    assignedDepartment: null,
    isOccupied: false,
    displayName: 'Transit Trolley 02',
  },
  {
    locationId: 'LINE_B_STAGING',
    locationType: 'STAGING',
    assignedDepartment: null,
    isOccupied: false,
    displayName: 'Line B · Staging Area',
  },
  {
    locationId: 'LINE_31_STAGING',
    locationType: 'STAGING',
    assignedDepartment: null,
    isOccupied: false,
    displayName: 'Line 31 · Staging Area',
  },
  {
    locationId: 'WH-DOCK-3',
    locationType: 'STAGING',
    assignedDepartment: null,
    isOccupied: false,
    displayName: 'Warehouse Dock 3',
  },
];

// ─── Simulated SAP_ERP (PDF §3.2.3.2 System A) ──────────────────────────────

export const SAP_ORDERS: SapOrder[] = [
  // ── Verbatim ──
  {
    sapPoNumber: '4500987654',
    recipientName: 'John Doe',
    department: 'MOE/LOG-A',
    orderStatus: 'ACTIVE',
  },
  {
    sapPoNumber: '4500987655',
    recipientName: 'Bob Builder',
    department: 'MOE/ENG-2',
    orderStatus: 'ACTIVE',
  },
  {
    sapPoNumber: '4500111222',
    recipientName: 'Sarah Connor',
    department: 'MOE/MFG-P',
    orderStatus: 'COMPLETED',
  },

  // ── Added: §3.2.4 B.1 states the SAP department "could be NULL" and the
  // recipient "could be a person, a department, or NULL". Neither branch is
  // reachable with the three rows above, so we seed both.
  {
    sapPoNumber: '4500222333',
    recipientName: 'Alice Wonderland',
    department: null, // forces the AD lookup to supply the department
    orderStatus: 'ACTIVE',
  },
  {
    sapPoNumber: '4500333444',
    recipientName: null, // no recipient at all → cascade must still resolve
    department: 'MOE/LOG-A',
    orderStatus: 'ACTIVE',
  },
];

// ─── Simulated Bosch_Active_Directory (PDF §3.2.3.2 System B) ───────────────

export const DIRECTORY_USERS: DirectoryUser[] = [
  // ── Verbatim ──
  {
    ntUserId: 'DOE2AN',
    recipientName: 'John Doe',
    emailAddress: 'john.doe@bosch.com',
    department: 'MOE/LOG-A',
  },
  {
    ntUserId: 'BUI4AN',
    recipientName: 'Bob Builder',
    emailAddress: 'bob.builder@bosch.com',
    department: 'MOE/ENG-2',
  },
  {
    ntUserId: 'CON1AN',
    recipientName: 'Sarah Connor',
    emailAddress: 'sarah.connor@bosch.com',
    department: 'MOE/MFG-P',
  },
  {
    ntUserId: 'WON5AN',
    recipientName: 'Alice Wonderland',
    emailAddress: 'alice.w@bosch.com',
    department: 'MOE/LOG-A',
    // §3.1.3.3 and the tbl_parcels sample both say "Alice Wonder"; the AD table
    // says "Alice Wonderland". Either spelling must resolve — see
    // docs/08-QUESTIONS-FOR-BOSCH.md Q7.
    aliases: ['Alice Wonder'],
  },
];

// ─── Parcels ────────────────────────────────────────────────────────────────

/**
 * The three rows from PDF §3.2.3.1, verbatim including their exact timestamps.
 * These are what Bosch can check against their own document — do not regenerate
 * or shift them.
 */
export const VERBATIM_PARCELS: Parcel[] = [
  {
    trackingId: 'JD0123456789012345',
    carrier: 'DHL',
    sapPoNumber: '4500987654',
    recipientName: 'John Doe',
    recipientDepartment: 'MOE/LOG-A',
    recipientEmail: 'john.doe@bosch.com',
    proposedLocation: 'RACK-A-04',
    actualLocation: 'RACK-A-04',
    status: 'STORED',
    sourceSystem: 'INBOUND_APP',
    timestampLastEvent: '2026-07-06T08:12:00.000Z',
    createdAt: '2026-07-06T08:12:00.000Z',
  },
  {
    trackingId: '1Z999AA10123456784',
    carrier: 'UPS',
    sapPoNumber: null,
    recipientName: 'Alice Wonder',
    recipientDepartment: 'MOE/LOG-A',
    recipientEmail: 'alice.w@bosch.com',
    proposedLocation: 'TROLLEY-01',
    actualLocation: 'TROLLEY-01',
    status: 'STORED',
    sourceSystem: 'INBOUND_APP',
    timestampLastEvent: '2026-07-06T09:30:15.000Z',
    createdAt: '2026-07-06T09:30:15.000Z',
  },
  {
    trackingId: 'MR-2026-07-08-001',
    carrier: 'Internal Milkrun',
    sapPoNumber: null,
    recipientName: null,
    recipientDepartment: null,
    recipientEmail: null,
    proposedLocation: null,
    actualLocation: 'LINE_B_STAGING',
    status: 'IN_TRANSIT',
    sourceSystem: 'MILKRUN',
    timestampLastEvent: '2026-07-06T10:05:00.000Z',
    createdAt: '2026-07-06T10:05:00.000Z',
  },
];

// ─── Deterministic generator ────────────────────────────────────────────────

/** mulberry32 — small, fast, seeded. Same seed always yields the same dataset. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function digits(rng: () => number, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += Math.floor(rng() * 10).toString();
  return out;
}

function alnum(rng: () => number, n: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(rng() * chars.length)];
  return out;
}

/** Generates a tracking ID that genuinely satisfies the §3.2.4 A regex. */
function trackingIdFor(carrier: string, rng: () => number): string {
  switch (carrier) {
    case 'DHL':
      return `JD${digits(rng, 16)}`;
    case 'UPS':
      return `1Z${alnum(rng, 16)}`;
    case 'Amazon':
      return `TBA${digits(rng, 12)}`;
    case 'GLS':
      return digits(rng, 12);
    default:
      return `MR-${digits(rng, 4)}`;
  }
}

const RECIPIENTS: { name: string; dept: string; email: string }[] = [
  { name: 'John Doe', dept: 'MOE/LOG-A', email: 'john.doe@bosch.com' },
  { name: 'Bob Builder', dept: 'MOE/ENG-2', email: 'bob.builder@bosch.com' },
  { name: 'Sarah Connor', dept: 'MOE/MFG-P', email: 'sarah.connor@bosch.com' },
  { name: 'Alice Wonderland', dept: 'MOE/LOG-A', email: 'alice.w@bosch.com' },
];

const RACK_LOCATIONS = [
  'RACK-A-04',
  'RACK-A-05',
  'RACK-A-06',
  'RACK-B-01',
  'RACK-B-02',
  'RACK-C-12',
  'RACK-C-13',
  'RACK-C-14',
];

const TRANSIT_LOCATIONS = [
  'LINE_B_STAGING',
  'LINE_31_STAGING',
  'WH-DOCK-3',
  'TROLLEY-01',
  'TROLLEY-02',
];

/**
 * Timestamps cluster inside working hours (06:00–18:00 Berlin) rather than
 * spreading uniformly across the clock. Uniform timestamps look synthetic the
 * moment anyone sorts by date, and someone always sorts by date.
 */
function workingHourTimestamp(
  rng: () => number,
  reference: Date,
  daysAgo: number,
): string {
  const d = new Date(reference);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(6 + Math.floor(rng() * 12), Math.floor(rng() * 60), Math.floor(rng() * 60), 0);
  return d.toISOString();
}

export interface GenerateOptions {
  /** Anchor for relative timestamps. Defaults to now, so "Today" filters work. */
  referenceDate?: Date;
  seed?: number;
  inboundCount?: number;
  milkrunCount?: number;
  internalCount?: number;
}

/**
 * Generate the dashboard dataset.
 *
 * PDF §3.2.2.2 is explicit that the table "does not only store the inbound
 * registration from App 1 but also includes data from other plant logistics
 * systems e.g. milkruns". If the dashboard only ever shows rows our own app
 * created, we have failed the stated intent — this is the easiest requirement
 * in the whole brief to overlook. Hence the milkrun and internal-transfer rows.
 */
export function generateParcels(options: GenerateOptions = {}): Parcel[] {
  const {
    referenceDate = new Date(),
    seed = 20260729,
    inboundCount = 70,
    milkrunCount = 35,
    internalCount = 10,
  } = options;

  const rng = makeRng(seed);
  const out: Parcel[] = [];

  // ── Inbound parcels ──
  const carriers = ['DHL', 'UPS', 'GLS', 'Amazon'] as const;
  for (let i = 0; i < inboundCount; i++) {
    const carrier = pick(rng, carriers);
    const r = rng();
    const recipient = r < 0.12 ? null : pick(rng, RECIPIENTS);
    const status: ParcelStatus = r < 0.35 ? 'DELIVERED' : 'STORED';
    // Cluster recent: most parcels in the last week, a tail out to 30 days.
    const daysAgo = Math.floor(Math.pow(rng(), 2.2) * 30);
    const location = pick(rng, RACK_LOCATIONS);
    const ts = workingHourTimestamp(rng, referenceDate, daysAgo);

    out.push({
      trackingId: trackingIdFor(carrier, rng),
      carrier,
      sapPoNumber: rng() < 0.55 ? `45${digits(rng, 8)}` : null,
      recipientName: recipient?.name ?? null,
      recipientDepartment: recipient?.dept ?? null,
      recipientEmail: recipient?.email ?? null,
      proposedLocation: location,
      actualLocation: location,
      status,
      sourceSystem: 'INBOUND_APP',
      timestampLastEvent: ts,
      createdAt: ts,
    });
  }

  // ── Internal milkrun items ──
  for (let i = 0; i < milkrunCount; i++) {
    const daysAgo = Math.floor(Math.pow(rng(), 2.5) * 14);
    const d = new Date(referenceDate);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const datePart = d.toISOString().slice(0, 10);
    const ts = workingHourTimestamp(rng, referenceDate, daysAgo);
    const status: ParcelStatus = rng() < 0.7 ? 'IN_TRANSIT' : 'DELIVERED';

    out.push({
      trackingId: `MR-${datePart}-${String(i + 2).padStart(3, '0')}`,
      carrier: 'Internal Milkrun',
      sapPoNumber: null,
      recipientName: null,
      recipientDepartment: null,
      recipientEmail: null,
      proposedLocation: null,
      actualLocation: pick(rng, TRANSIT_LOCATIONS),
      status,
      sourceSystem: 'MILKRUN',
      timestampLastEvent: ts,
      createdAt: ts,
    });
  }

  // ── Internal department-to-department transfers ──
  for (let i = 0; i < internalCount; i++) {
    const recipient = pick(rng, RECIPIENTS);
    const daysAgo = Math.floor(rng() * 20);
    const ts = workingHourTimestamp(rng, referenceDate, daysAgo);

    out.push({
      trackingId: `INT-${digits(rng, 8)}`,
      carrier: 'Internal Transfer',
      sapPoNumber: null,
      recipientName: recipient.name,
      recipientDepartment: recipient.dept,
      recipientEmail: recipient.email,
      proposedLocation: null,
      actualLocation: pick(rng, [...RACK_LOCATIONS, ...TRANSIT_LOCATIONS]),
      status: rng() < 0.5 ? 'IN_TRANSIT' : 'DELIVERED',
      sourceSystem: 'INTERNAL_TRANSFER',
      timestampLastEvent: ts,
      createdAt: ts,
    });
  }

  // ── Deliberately interesting rows the demo narrative depends on ──

  // Aged parcel: drives the "Awaiting pickup > 24h" KPI and the amber rail.
  const agedTs = workingHourTimestamp(rng, referenceDate, 4);
  out.push({
    trackingId: `JD${digits(rng, 16)}`,
    carrier: 'DHL',
    sapPoNumber: '4500987654',
    recipientName: 'John Doe',
    recipientDepartment: 'MOE/LOG-A',
    recipientEmail: 'john.doe@bosch.com',
    proposedLocation: 'RACK-A-04',
    actualLocation: 'RACK-A-04',
    status: 'STORED',
    sourceSystem: 'INBOUND_APP',
    timestampLastEvent: agedTs,
    createdAt: agedTs,
  });

  // Today's arrivals: guarantees the "Total today" KPI is never zero, whatever
  // day the demo happens on.
  for (let i = 0; i < 6; i++) {
    const carrier = pick(rng, carriers);
    const recipient = pick(rng, RECIPIENTS);
    const location = pick(rng, RACK_LOCATIONS);
    const ts = workingHourTimestamp(rng, referenceDate, 0);
    out.push({
      trackingId: trackingIdFor(carrier, rng),
      carrier,
      sapPoNumber: null,
      recipientName: recipient.name,
      recipientDepartment: recipient.dept,
      recipientEmail: recipient.email,
      proposedLocation: location,
      actualLocation: location,
      status: 'STORED',
      sourceSystem: 'INBOUND_APP',
      timestampLastEvent: ts,
      createdAt: ts,
    });
  }

  return out;
}

/**
 * The complete parcel seed: the three verbatim PDF rows first, then generated
 * data, de-duplicated by tracking ID (the primary key).
 */
export function buildParcelSeed(options: GenerateOptions = {}): Parcel[] {
  const seen = new Set<string>();
  const all = [...VERBATIM_PARCELS, ...generateParcels(options)];
  return all.filter((p) => {
    if (seen.has(p.trackingId)) return false;
    seen.add(p.trackingId);
    return true;
  });
}
