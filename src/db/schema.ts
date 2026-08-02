/**
 * Drizzle schema — SQLite driver, per docs/09-SCOPE-CONFERENCE-DEMO.md §3 and
 * docs/05-DATA-MODEL.md §3/§4.
 *
 * Column names and shapes follow the PDF and the data model doc exactly, only
 * adapted for SQLite's type system: TEXT for enums, INTEGER (0/1) for
 * booleans, ISO-8601 TEXT for timestamps. No migration ceremony — DDL is
 * applied directly by src/db/client.ts via `CREATE TABLE IF NOT EXISTS`,
 * matching "same schema readability, no migration ceremony" from the scope
 * doc. This file is the query-typing source of truth for Drizzle.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── App 2 / App 3 domain (docs/05-DATA-MODEL.md §3) ────────────────────────

export const storageLocations = sqliteTable('tbl_storage_locations', {
  locationId: text('location_id').primaryKey(),
  locationType: text('location_type').notNull(), // 'RACK' | 'TROLLEY' | 'STAGING'
  assignedDepartment: text('assigned_department'),
  isOccupied: integer('is_occupied', { mode: 'boolean' }).notNull().default(false),
  displayName: text('display_name'),
});

export const parcels = sqliteTable('tbl_parcels', {
  trackingId: text('tracking_id').primaryKey(),
  carrier: text('carrier').notNull(),
  sapPoNumber: text('sap_po_number'),
  recipientName: text('recipient_name'),
  recipientDepartment: text('recipient_department'),
  recipientEmail: text('recipient_email'),
  proposedLocation: text('proposed_location'),
  actualLocation: text('actual_location'),
  status: text('status').notNull(), // 'STORED' | 'IN_TRANSIT' | 'DELIVERED'
  sourceSystem: text('source_system').notNull().default('INBOUND_APP'),
  timestampLastEvent: text('timestamp_last_event').notNull(),
  createdAt: text('created_at').notNull(),
});

export const parcelEvents = sqliteTable('parcel_events', {
  eventPk: integer('event_pk').primaryKey({ autoIncrement: true }),
  trackingId: text('tracking_id').notNull(),
  kind: text('kind').notNull(),
  payload: text('payload'), // JSON-stringified
  actor: text('actor'),
  createdAt: text('created_at').notNull(),
});

export const carrierFormats = sqliteTable('carrier_formats', {
  carrier: text('carrier').primaryKey(),
  pattern: text('pattern').notNull(),
  priority: integer('priority').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const locationReservations = sqliteTable('location_reservations', {
  locationId: text('location_id').primaryKey(),
  sessionId: text('session_id').notNull(),
  expiresAt: text('expires_at').notNull(),
});

// ─── Mock external systems (docs/05-DATA-MODEL.md §4) ───────────────────────

export const mockSapOrders = sqliteTable('mock_sap_orders', {
  sapPoNumber: text('sap_po_number').primaryKey(),
  recipientName: text('recipient_name'),
  department: text('department'),
  orderStatus: text('order_status').notNull(),
});

export const mockDirectoryUsers = sqliteTable('mock_directory_users', {
  ntUserId: text('nt_user_id').primaryKey(),
  recipientName: text('recipient_name').notNull(),
  emailAddress: text('email_address').notNull(),
  department: text('department'),
  aliases: text('aliases'), // JSON-stringified string[]
});

export const mockEmails = sqliteTable('mock_emails', {
  emailId: integer('email_id').primaryKey({ autoIncrement: true }),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sentAt: text('sent_at').notNull(),
  context: text('context'), // JSON-stringified
});

// ─── Ops console — event log across the whole engine, not just parcels ──────
// Distinct from parcel_events: this is the ops-console-wide feed that also
// records decisions with no parcel yet (e.g. a rejected scan, a skipped AD
// query) — CLAUDE.md rule 4: "Every decision is observable... especially a
// skip." parcel_events only exists once a tracking ID is known.

export const opsEvents = sqliteTable('ops_events', {
  eventPk: integer('event_pk').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull(),
  trackingId: text('tracking_id'),
  decision: text('decision').notNull(), // e.g. 'REJECTED', 'SKIPPED', 'OK'
  reason: text('reason').notNull(),
  payload: text('payload'), // JSON-stringified
  createdAt: text('created_at').notNull(),
});
