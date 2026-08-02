/**
 * Query/read/write access to tbl_parcels — the one table both App 2 (writer)
 * and App 3 (reader) share, per PDF §3.2.2.2.
 */

import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { parcelEvents, parcels, storageLocations } from '../db/schema';
import type { LocationType, Parcel, ParcelStatus } from '../engine/types';
import { berlinMidnightUtc } from '../lib/timezone';

export const UNASSIGNED_RECIPIENT = '__UNASSIGNED__';

export interface ParcelFilters {
  carrier?: string[];
  status?: ParcelStatus[];
  /** UNASSIGNED_RECIPIENT selects NULL recipients; otherwise a partial, case-insensitive match. */
  recipient?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  locationType?: LocationType;
  search?: string;
}

export interface ParcelSort {
  field: 'timestampLastEvent' | 'trackingId' | 'carrier' | 'status' | 'recipientName' | 'actualLocation';
  direction: 'asc' | 'desc';
}

export interface ParcelRow extends Parcel {
  locationType: LocationType | null;
}

export interface QueryParcelsOptions {
  filters?: ParcelFilters;
  sort?: ParcelSort;
  limit?: number;
  offset?: number;
}

export interface QueryParcelsResult {
  rows: ParcelRow[];
  total: number;
}

const SORT_COLUMNS = {
  timestampLastEvent: parcels.timestampLastEvent,
  trackingId: parcels.trackingId,
  carrier: parcels.carrier,
  status: parcels.status,
  recipientName: parcels.recipientName,
  actualLocation: parcels.actualLocation,
} as const;

function buildConditions(filters: ParcelFilters) {
  const conditions = [];

  if (filters.carrier?.length) conditions.push(inArray(parcels.carrier, filters.carrier));
  if (filters.status?.length) conditions.push(inArray(parcels.status, filters.status));

  if (filters.recipient === UNASSIGNED_RECIPIENT) {
    conditions.push(isNull(parcels.recipientName));
  } else if (filters.recipient) {
    conditions.push(like(sql`lower(${parcels.recipientName})`, `%${filters.recipient.toLowerCase()}%`));
  }

  if (filters.department) conditions.push(eq(parcels.recipientDepartment, filters.department));
  if (filters.dateFrom) conditions.push(gte(parcels.timestampLastEvent, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(parcels.timestampLastEvent, filters.dateTo));
  if (filters.locationType) conditions.push(eq(storageLocations.locationType, filters.locationType));

  if (filters.search) {
    const q = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${parcels.trackingId})`, q),
        like(sql`lower(${parcels.recipientName})`, q),
        like(sql`lower(${parcels.actualLocation})`, q),
        like(sql`lower(${parcels.recipientDepartment})`, q),
        like(sql`lower(${parcels.sapPoNumber})`, q),
      ),
    );
  }

  return conditions;
}

function toParcelRow(row: {
  trackingId: string;
  carrier: string;
  sapPoNumber: string | null;
  recipientName: string | null;
  recipientDepartment: string | null;
  recipientEmail: string | null;
  proposedLocation: string | null;
  actualLocation: string | null;
  status: string;
  sourceSystem: string;
  timestampLastEvent: string;
  createdAt: string;
  locationType: string | null;
}): ParcelRow {
  return {
    ...row,
    status: row.status as ParcelStatus,
    sourceSystem: row.sourceSystem as Parcel['sourceSystem'],
    locationType: row.locationType as LocationType | null,
  };
}

export function queryParcels(opts: QueryParcelsOptions = {}): QueryParcelsResult {
  const { filters = {}, sort, limit = 500, offset = 0 } = opts;
  const conditions = buildConditions(filters);
  const where = conditions.length ? and(...conditions) : undefined;

  const sortColumn = SORT_COLUMNS[sort?.field ?? 'timestampLastEvent'];
  const direction = sort?.direction === 'asc' ? asc(sortColumn) : desc(sortColumn);

  let rowsQuery = db
    .select({
      trackingId: parcels.trackingId,
      carrier: parcels.carrier,
      sapPoNumber: parcels.sapPoNumber,
      recipientName: parcels.recipientName,
      recipientDepartment: parcels.recipientDepartment,
      recipientEmail: parcels.recipientEmail,
      proposedLocation: parcels.proposedLocation,
      actualLocation: parcels.actualLocation,
      status: parcels.status,
      sourceSystem: parcels.sourceSystem,
      timestampLastEvent: parcels.timestampLastEvent,
      createdAt: parcels.createdAt,
      locationType: storageLocations.locationType,
    })
    .from(parcels)
    .leftJoin(storageLocations, eq(parcels.actualLocation, storageLocations.locationId))
    .$dynamic();

  if (where) rowsQuery = rowsQuery.where(where);
  const rows = rowsQuery.orderBy(direction).limit(limit).offset(offset).all();

  let countQuery = db
    .select({ n: sql<number>`count(*)` })
    .from(parcels)
    .leftJoin(storageLocations, eq(parcels.actualLocation, storageLocations.locationId))
    .$dynamic();
  if (where) countQuery = countQuery.where(where);
  const countRow = countQuery.get();

  return { rows: rows.map(toParcelRow), total: countRow?.n ?? rows.length };
}

export interface ParcelEventRecord {
  eventPk: number;
  trackingId: string;
  kind: string;
  payload: Record<string, unknown> | null;
  actor: string | null;
  createdAt: string;
}

export function getParcelDetail(
  trackingId: string,
): { parcel: ParcelRow; events: ParcelEventRecord[] } | null {
  const row = db
    .select({
      trackingId: parcels.trackingId,
      carrier: parcels.carrier,
      sapPoNumber: parcels.sapPoNumber,
      recipientName: parcels.recipientName,
      recipientDepartment: parcels.recipientDepartment,
      recipientEmail: parcels.recipientEmail,
      proposedLocation: parcels.proposedLocation,
      actualLocation: parcels.actualLocation,
      status: parcels.status,
      sourceSystem: parcels.sourceSystem,
      timestampLastEvent: parcels.timestampLastEvent,
      createdAt: parcels.createdAt,
      locationType: storageLocations.locationType,
    })
    .from(parcels)
    .leftJoin(storageLocations, eq(parcels.actualLocation, storageLocations.locationId))
    .where(eq(parcels.trackingId, trackingId))
    .get();

  if (!row) return null;

  const events = db
    .select()
    .from(parcelEvents)
    .where(eq(parcelEvents.trackingId, trackingId))
    .orderBy(asc(parcelEvents.createdAt))
    .all()
    .map((e) => ({
      eventPk: e.eventPk,
      trackingId: e.trackingId,
      kind: e.kind,
      payload: e.payload ? (JSON.parse(e.payload) as Record<string, unknown>) : null,
      actor: e.actor,
      createdAt: e.createdAt,
    }));

  return { parcel: toParcelRow(row), events };
}

export function getParcelByTrackingId(trackingId: string): Parcel | null {
  const row = db.select().from(parcels).where(eq(parcels.trackingId, trackingId)).get();
  if (!row) return null;
  return { ...row, status: row.status as ParcelStatus, sourceSystem: row.sourceSystem as Parcel['sourceSystem'] };
}

export function getDistinctFilterValues(): {
  carriers: string[];
  departments: string[];
  statuses: ParcelStatus[];
} {
  const carrierRows = db
    .select({ carrier: parcels.carrier })
    .from(parcels)
    .groupBy(parcels.carrier)
    .all();
  const deptRows = db
    .select({ dept: parcels.recipientDepartment })
    .from(parcels)
    .where(sql`${parcels.recipientDepartment} IS NOT NULL`)
    .groupBy(parcels.recipientDepartment)
    .all();

  return {
    carriers: carrierRows.map((r) => r.carrier).sort(),
    departments: deptRows.map((r) => r.dept!).sort(),
    statuses: ['STORED', 'IN_TRANSIT', 'DELIVERED'],
  };
}

export interface DashboardKpis {
  totalToday: number;
  inTransit: number;
  stored: number;
  awaitingPickupOver24h: number;
}

export function getDashboardKpis(referenceDate: Date = new Date()): DashboardKpis {
  const todayStart = berlinMidnightUtc(referenceDate).toISOString();
  const cutoff24h = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const totalToday = db
    .select({ n: sql<number>`count(*)` })
    .from(parcels)
    .where(gte(parcels.timestampLastEvent, todayStart))
    .get()!.n;

  const inTransit = db
    .select({ n: sql<number>`count(*)` })
    .from(parcels)
    .where(eq(parcels.status, 'IN_TRANSIT'))
    .get()!.n;

  const stored = db
    .select({ n: sql<number>`count(*)` })
    .from(parcels)
    .where(eq(parcels.status, 'STORED'))
    .get()!.n;

  const awaitingPickupOver24h = db
    .select({ n: sql<number>`count(*)` })
    .from(parcels)
    .where(and(eq(parcels.status, 'STORED'), lte(parcels.timestampLastEvent, cutoff24h)))
    .get()!.n;

  return { totalToday, inTransit, stored, awaitingPickupOver24h };
}

// ─── Writes (used by the inbound finalisation transaction) ──────────────────

export function insertParcel(parcel: Parcel): void {
  db.insert(parcels).values(parcel).run();
}

export function insertParcelEvent(event: {
  trackingId: string;
  kind: string;
  payload?: Record<string, unknown>;
  actor?: string;
}): void {
  db.insert(parcelEvents)
    .values({
      trackingId: event.trackingId,
      kind: event.kind,
      payload: event.payload ? JSON.stringify(event.payload) : null,
      actor: event.actor ?? null,
      createdAt: new Date().toISOString(),
    })
    .run();
}
