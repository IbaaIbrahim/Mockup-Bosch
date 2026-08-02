/**
 * GET /api/parcels/meta — distinct filter values + KPI strip data.
 * Also the schema context fed to the NL-search endpoint (docs/09-SCOPE-CONFERENCE-DEMO.md §6).
 */

import { NextResponse } from 'next/server';
import { getDashboardKpis, getDistinctFilterValues } from '../../../../server/parcels-repo';

export async function GET() {
  const [distinct, kpis] = [getDistinctFilterValues(), getDashboardKpis()];
  return NextResponse.json({ ...distinct, kpis });
}
