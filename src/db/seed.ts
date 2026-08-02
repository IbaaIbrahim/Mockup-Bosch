/**
 * Seeds the database from src/db/seed-data.ts to the exact demo baseline.
 *
 * `npm run demo:reset` truncates and reseeds. Run it between every rehearsal
 * and immediately before going on stage (risk R12 — docs/05-DATA-MODEL.md §6).
 * Deterministic: same seed constant in generateParcels() every time, so the
 * wrong-QR drill and the cascade demos behave identically across runs.
 */

import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import {
  CARRIER_FORMATS,
  DIRECTORY_USERS,
  SAP_ORDERS,
  STORAGE_LOCATIONS,
  buildParcelSeed,
} from './seed-data';
import { decideEmail } from '../engine/recipient-resolution';

const EVENT_KIND_FOR_STATUS: Record<string, string> = {
  STORED: 'STORED',
  IN_TRANSIT: 'SCANNED',
  DELIVERED: 'PICKED_UP',
};

export function seedDatabase(sqlite: BetterSqlite3Database): void {
  const db = drizzle(sqlite, { schema });

  db.transaction((tx) => {
    // Wipe in FK-safe order.
    tx.delete(schema.parcelEvents).run();
    tx.delete(schema.opsEvents).run();
    tx.delete(schema.locationReservations).run();
    tx.delete(schema.mockEmails).run();
    tx.delete(schema.parcels).run();
    tx.delete(schema.storageLocations).run();
    tx.delete(schema.carrierFormats).run();
    tx.delete(schema.mockSapOrders).run();
    tx.delete(schema.mockDirectoryUsers).run();

    tx.insert(schema.storageLocations)
      .values(
        STORAGE_LOCATIONS.map((l) => ({
          locationId: l.locationId,
          locationType: l.locationType,
          assignedDepartment: l.assignedDepartment,
          isOccupied: l.isOccupied,
          displayName: l.displayName ?? null,
        })),
      )
      .run();

    tx.insert(schema.carrierFormats).values([...CARRIER_FORMATS]).run();

    tx.insert(schema.mockSapOrders)
      .values(
        SAP_ORDERS.map((o) => ({
          sapPoNumber: o.sapPoNumber,
          recipientName: o.recipientName,
          department: o.department,
          orderStatus: o.orderStatus,
        })),
      )
      .run();

    tx.insert(schema.mockDirectoryUsers)
      .values(
        DIRECTORY_USERS.map((u) => ({
          ntUserId: u.ntUserId,
          recipientName: u.recipientName,
          emailAddress: u.emailAddress,
          department: u.department,
          aliases: u.aliases ? JSON.stringify(u.aliases) : null,
        })),
      )
      .run();

    const parcelSeed = buildParcelSeed();

    tx.insert(schema.parcels).values(parcelSeed).run();

    // One terminal-state event per parcel, so the detail drawer's timeline is
    // never empty (CLAUDE.md rule 4 — every decision is observable).
    const events = parcelSeed.map((p) => ({
      trackingId: p.trackingId,
      kind: EVENT_KIND_FOR_STATUS[p.status] ?? 'STORED',
      payload: JSON.stringify({ location: p.actualLocation, sourceSystem: p.sourceSystem }),
      actor: p.sourceSystem === 'INBOUND_APP' ? 'inbound-app' : p.sourceSystem.toLowerCase(),
      createdAt: p.timestampLastEvent,
    }));
    if (events.length > 0) tx.insert(schema.parcelEvents).values(events).run();

    // Seed a plausible email history for already-STORED rack parcels with a
    // known email, so the Inbox view isn't empty on first boot either.
    const emailRows = parcelSeed
      .filter(
        (p) =>
          p.status !== 'IN_TRANSIT' &&
          p.actualLocation &&
          p.recipientEmail &&
          p.sourceSystem === 'INBOUND_APP',
      )
      .map((p) => {
        const decision = decideEmail({
          proposedLocation: p.proposedLocation ?? p.actualLocation!,
          actualLocation: p.actualLocation!,
          recipientEmail: p.recipientEmail,
          trackingId: p.trackingId,
          carrier: p.carrier,
        });
        return decision.send
          ? {
              toAddress: decision.to!,
              subject: decision.subject!,
              body: decision.body!,
              sentAt: p.timestampLastEvent,
              context: JSON.stringify({ trackingId: p.trackingId }),
            }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (emailRows.length > 0) tx.insert(schema.mockEmails).values(emailRows).run();
  });
}

/** Seed only if the database is empty — used on first dev-server boot. */
export function seedIfEmpty(sqlite: BetterSqlite3Database): void {
  const row = sqlite
    .prepare('SELECT COUNT(*) AS n FROM tbl_storage_locations')
    .get() as { n: number };
  if (row.n === 0) seedDatabase(sqlite);
}
