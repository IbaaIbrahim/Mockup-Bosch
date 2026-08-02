/**
 * `npm run demo:reset` — wipes and reseeds the database to the exact baseline
 * state. Run between every rehearsal and immediately before going on stage
 * (risk R12, docs/05-DATA-MODEL.md §6): data drift across rehearsals is a
 * demo-killing bug, not a cosmetic one.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedDatabase } from './seed';

const DB_PATH = process.env.DEMO_DB_PATH || './data/demo.sqlite';

const dir = dirname(DB_PATH);
if (DB_PATH !== ':memory:' && !existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Keep the DDL identical to src/db/client.ts — see that file for the schema.
// Re-import is avoided here to keep this script runnable standalone via tsx
// without pulling in the Next.js-oriented module-global cache guard.
sqlite.exec(`
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
`);

seedDatabase(sqlite);

const counts = {
  locations: sqlite.prepare('SELECT COUNT(*) AS n FROM tbl_storage_locations').get() as { n: number },
  parcels: sqlite.prepare('SELECT COUNT(*) AS n FROM tbl_parcels').get() as { n: number },
  sapOrders: sqlite.prepare('SELECT COUNT(*) AS n FROM mock_sap_orders').get() as { n: number },
  directoryUsers: sqlite.prepare('SELECT COUNT(*) AS n FROM mock_directory_users').get() as { n: number },
  emails: sqlite.prepare('SELECT COUNT(*) AS n FROM mock_emails').get() as { n: number },
};

sqlite.close();

console.log('Demo data reset to baseline:');
console.log(`  storage locations : ${counts.locations.n}`);
console.log(`  parcels           : ${counts.parcels.n}`);
console.log(`  SAP orders        : ${counts.sapOrders.n}`);
console.log(`  directory users   : ${counts.directoryUsers.n}`);
console.log(`  seeded emails     : ${counts.emails.n}`);
