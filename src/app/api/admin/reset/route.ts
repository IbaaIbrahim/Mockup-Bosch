import { NextResponse } from 'next/server';
import { rawDb } from '../../../../db/client';
import { seedDatabase } from '../../../../db/seed';
import { logOpsEvent } from '../../../../server/ops-events-repo';

/**
 * Ops-console reset button — the in-app equivalent of `npm run demo:reset`
 * (docs/05-DATA-MODEL.md §6, risk R12). Restores the exact baseline state.
 */
export async function POST() {
  seedDatabase(rawDb);
  // The reset itself wipes ops_events, so this is the first row of the fresh log —
  // visible confirmation the reset actually ran, not a silent no-op.
  logOpsEvent({ kind: 'DEMO_RESET', decision: 'OK', reason: 'Ops console reset demo data to baseline' });
  return NextResponse.json({ ok: true });
}
