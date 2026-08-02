/**
 * Storage locations + soft reservations.
 *
 * docs/03-APP2-INBOUND.md §5: "the proposed location is soft-reserved for the
 * session (5-minute TTL) so two concurrent operators cannot be sent to the
 * same rack." The cascade itself (src/engine/location-cascade.ts) only knows
 * about `isOccupied`; this repo is what makes a location reserved-by-someone-
 * else look occupied to the cascade without touching the real flag.
 */

import { eq, ne, lt } from 'drizzle-orm';
import { db } from '../db/client';
import { locationReservations, storageLocations } from '../db/schema';
import type { StorageLocation } from '../engine/types';

const RESERVATION_TTL_MS = 5 * 60 * 1000;

function toStorageLocation(row: typeof storageLocations.$inferSelect): StorageLocation {
  return {
    locationId: row.locationId,
    locationType: row.locationType as StorageLocation['locationType'],
    assignedDepartment: row.assignedDepartment,
    isOccupied: row.isOccupied,
    displayName: row.displayName ?? undefined,
  };
}

/** Deletes reservations whose TTL has elapsed. Called before every cascade read. */
function sweepExpiredReservations(): void {
  db.delete(locationReservations)
    .where(lt(locationReservations.expiresAt, new Date().toISOString()))
    .run();
}

/**
 * Locations as the cascade should see them: a rack reserved by a different
 * session reads as occupied, even though `is_occupied` is still false until
 * finalisation actually happens.
 */
export function getLocationsForCascade(sessionId: string): StorageLocation[] {
  sweepExpiredReservations();
  const rows = db.select().from(storageLocations).all();
  const reservedByOthers = new Set(
    db
      .select()
      .from(locationReservations)
      .where(ne(locationReservations.sessionId, sessionId))
      .all()
      .map((r) => r.locationId),
  );
  return rows.map((row) => {
    const loc = toStorageLocation(row);
    return reservedByOthers.has(loc.locationId) ? { ...loc, isOccupied: true } : loc;
  });
}

export function getAllLocations(): StorageLocation[] {
  return db.select().from(storageLocations).all().map(toStorageLocation);
}

export function getAllLocationIds(): string[] {
  return db.select({ id: storageLocations.locationId }).from(storageLocations).all().map((r) => r.id);
}

export function getLocation(locationId: string): StorageLocation | null {
  const row = db
    .select()
    .from(storageLocations)
    .where(eq(storageLocations.locationId, locationId))
    .get();
  return row ? toStorageLocation(row) : null;
}

export function reserveLocation(locationId: string, sessionId: string): void {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();
  db.insert(locationReservations)
    .values({ locationId, sessionId, expiresAt })
    .onConflictDoUpdate({
      target: locationReservations.locationId,
      set: { sessionId, expiresAt },
    })
    .run();
}

export function releaseReservation(locationId: string): void {
  db.delete(locationReservations).where(eq(locationReservations.locationId, locationId)).run();
}

export function markOccupied(locationId: string): void {
  db.update(storageLocations)
    .set({ isOccupied: true })
    .where(eq(storageLocations.locationId, locationId))
    .run();
}

/** Admin live-add — risk R4: "their QR encodes an unexpected value." */
export function registerLocation(params: {
  locationId: string;
  locationType: StorageLocation['locationType'];
  assignedDepartment?: string | null;
  displayName?: string | null;
}): StorageLocation {
  db.insert(storageLocations)
    .values({
      locationId: params.locationId,
      locationType: params.locationType,
      assignedDepartment: params.assignedDepartment ?? null,
      isOccupied: false,
      displayName: params.displayName ?? null,
    })
    .run();
  return getLocation(params.locationId)!;
}
