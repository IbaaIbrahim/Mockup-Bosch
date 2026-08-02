import { NextResponse } from 'next/server';
import { rawDb } from '../../../../db/client';
import { eventHub } from '../../../../server/events-hub';
import { DEFAULT_ADAPTER_LATENCY_MS } from '../../../../adapters/latency';

function count(table: string): number {
  const row = rawDb.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
  return row.n;
}

export async function GET() {
  return NextResponse.json({
    db: { ok: true, path: process.env.DEMO_DB_PATH || './data/demo.sqlite' },
    counts: {
      parcels: count('tbl_parcels'),
      storageLocations: count('tbl_storage_locations'),
      emails: count('mock_emails'),
      opsEvents: count('ops_events'),
    },
    adapters: { latencyMs: DEFAULT_ADAPTER_LATENCY_MS },
    realtime: {
      parcelStreamListeners: eventHub.listenerCount('parcelChange'),
      opsStreamListeners: eventHub.listenerCount('opsEvent'),
    },
    uptimeSeconds: Math.round(process.uptime()),
    serverTime: new Date().toISOString(),
  });
}
