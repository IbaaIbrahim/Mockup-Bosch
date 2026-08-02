/**
 * SQLite connection + Drizzle client.
 *
 * Single file, zero infra — docs/09-SCOPE-CONFERENCE-DEMO.md §3: "npm install
 * && npm run dev and it runs. Nothing to start, nothing to fail on venue
 * hardware." DDL is applied directly (CREATE TABLE IF NOT EXISTS) rather than
 * through a migration runner — "same schema readability, no migration
 * ceremony."
 *
 * A module-level singleton, guarded against Next.js dev-mode hot-reload
 * re-execution (which would otherwise open the file twice and leak handles).
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';
import { seedIfEmpty } from './seed';

const DB_PATH = process.env.DEMO_DB_PATH || './data/demo.sqlite';

const DDL = `
CREATE TABLE IF NOT EXISTS tbl_storage_locations (
  location_id         TEXT PRIMARY KEY,
  location_type       TEXT NOT NULL,
  assigned_department  TEXT,
  is_occupied         INTEGER NOT NULL DEFAULT 0,
  display_name        TEXT
);

CREATE TABLE IF NOT EXISTS tbl_parcels (
  tracking_id          TEXT PRIMARY KEY,
  carrier              TEXT NOT NULL,
  sap_po_number        TEXT,
  recipient_name       TEXT,
  recipient_department TEXT,
  recipient_email      TEXT,
  proposed_location    TEXT REFERENCES tbl_storage_locations(location_id),
  actual_location      TEXT,
  status               TEXT NOT NULL,
  source_system        TEXT NOT NULL DEFAULT 'INBOUND_APP',
  timestamp_last_event TEXT NOT NULL,
  created_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parcels_status  ON tbl_parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_carrier ON tbl_parcels(carrier);
CREATE INDEX IF NOT EXISTS idx_parcels_ts      ON tbl_parcels(timestamp_last_event DESC);
CREATE INDEX IF NOT EXISTS idx_parcels_recip   ON tbl_parcels(recipient_name);

CREATE TABLE IF NOT EXISTS parcel_events (
  event_pk    INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_id TEXT NOT NULL REFERENCES tbl_parcels(tracking_id),
  kind        TEXT NOT NULL,
  payload     TEXT,
  actor       TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parcel_events_tracking ON parcel_events(tracking_id);

CREATE TABLE IF NOT EXISTS carrier_formats (
  carrier   TEXT PRIMARY KEY,
  pattern   TEXT NOT NULL,
  priority  INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS location_reservations (
  location_id TEXT PRIMARY KEY REFERENCES tbl_storage_locations(location_id),
  session_id  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mock_sap_orders (
  sap_po_number  TEXT PRIMARY KEY,
  recipient_name TEXT,
  department     TEXT,
  order_status   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mock_directory_users (
  nt_user_id     TEXT PRIMARY KEY,
  recipient_name TEXT NOT NULL,
  email_address  TEXT NOT NULL,
  department     TEXT,
  aliases        TEXT
);
CREATE INDEX IF NOT EXISTS idx_ad_name ON mock_directory_users(recipient_name);

CREATE TABLE IF NOT EXISTS mock_emails (
  email_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  to_address TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  sent_at    TEXT NOT NULL,
  context    TEXT
);

CREATE TABLE IF NOT EXISTS ops_events (
  event_pk     INTEGER PRIMARY KEY AUTOINCREMENT,
  kind         TEXT NOT NULL,
  tracking_id  TEXT,
  decision     TEXT NOT NULL,
  reason       TEXT NOT NULL,
  payload      TEXT,
  created_at   TEXT NOT NULL
);
`;

function openDatabase(): Database.Database {
  if (DB_PATH !== ':memory:') {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(DDL);
  // First boot after a fresh `npm install && npm run dev`: the demo must show
  // data immediately, not after a manual seed step.
  seedIfEmpty(sqlite);
  return sqlite;
}

declare global {
  var __demoSqlite: Database.Database | undefined;
}

const sqlite = globalThis.__demoSqlite ?? openDatabase();
if (process.env.NODE_ENV !== 'production') globalThis.__demoSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export const rawDb = sqlite;
