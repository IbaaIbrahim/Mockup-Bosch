/**
 * Ops console event feed — CLAUDE.md rule 4: "Every decision is observable.
 * Anything the engine decides — especially a skip — writes an event row and
 * surfaces in the ops console. Gates C7 and C14 are 'nothing happened'
 * moments; invisible correctness scores zero."
 *
 * This is deliberately separate from `parcel_events`: a rejected scan or a
 * skipped AD query happens before a tracking ID exists, so it has nowhere to
 * attach in `tbl_parcels`. `ops_events` is the append-only log of every
 * decision the system makes, parcel or not.
 */

import { desc } from 'drizzle-orm';
import { db } from '../db/client';
import { opsEvents } from '../db/schema';
import { eventHub } from './events-hub';

export type OpsDecision = 'OK' | 'REJECTED' | 'SKIPPED' | 'BLOCKED' | 'NOT_FOUND';

export interface LogOpsEventParams {
  kind: string;
  decision: OpsDecision;
  reason: string;
  trackingId?: string | null;
  payload?: Record<string, unknown>;
}

export interface OpsEventRecord {
  eventPk: number;
  kind: string;
  trackingId: string | null;
  decision: OpsDecision;
  reason: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export function logOpsEvent(params: LogOpsEventParams): OpsEventRecord {
  const createdAt = new Date().toISOString();
  const row = db
    .insert(opsEvents)
    .values({
      kind: params.kind,
      trackingId: params.trackingId ?? null,
      decision: params.decision,
      reason: params.reason,
      payload: params.payload ? JSON.stringify(params.payload) : null,
      createdAt,
    })
    .returning()
    .get();

  const record: OpsEventRecord = {
    eventPk: row.eventPk,
    kind: row.kind,
    trackingId: row.trackingId,
    decision: row.decision as OpsDecision,
    reason: row.reason,
    payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
  };

  eventHub.emitOpsEvent(record);
  return record;
}

export function listOpsEvents(limit = 200): OpsEventRecord[] {
  return db
    .select()
    .from(opsEvents)
    .orderBy(desc(opsEvents.eventPk))
    .limit(limit)
    .all()
    .map((row) => ({
      eventPk: row.eventPk,
      kind: row.kind,
      trackingId: row.trackingId,
      decision: row.decision as OpsDecision,
      reason: row.reason,
      payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : null,
      createdAt: row.createdAt,
    }));
}
