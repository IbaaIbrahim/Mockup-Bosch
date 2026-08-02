/**
 * GET /api/parcels — the query API behind all three dashboard modes
 * (docs/04-APP3-DASHBOARD.md §4). Strictly read-only (A3.1): no mutation
 * endpoint is reachable from this route.
 */

import { NextResponse } from 'next/server';
import { queryParcels, UNASSIGNED_RECIPIENT, type ParcelFilters, type ParcelSort } from '../../../server/parcels-repo';
import type { ParcelStatus } from '../../../engine/types';

const VALID_STATUSES: ParcelStatus[] = ['STORED', 'IN_TRANSIT', 'DELIVERED'];
const VALID_SORT_FIELDS: ParcelSort['field'][] = [
  'timestampLastEvent',
  'trackingId',
  'carrier',
  'status',
  'recipientName',
  'actualLocation',
];

function parseList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const list = value.split(',').map((v) => v.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const statusParam = parseList(p.get('status'));
  const status = statusParam?.filter((s): s is ParcelStatus => VALID_STATUSES.includes(s as ParcelStatus));

  const recipient = p.get('recipient') === 'unassigned' ? UNASSIGNED_RECIPIENT : p.get('recipient') || undefined;

  const filters: ParcelFilters = {
    carrier: parseList(p.get('carrier')),
    status,
    recipient,
    department: p.get('department') || undefined,
    dateFrom: p.get('dateFrom') || undefined,
    dateTo: p.get('dateTo') || undefined,
    locationType: (p.get('locationType') as ParcelFilters['locationType']) || undefined,
    search: p.get('search') || undefined,
  };

  const sortField = p.get('sortField');
  const sort: ParcelSort | undefined = VALID_SORT_FIELDS.includes(sortField as ParcelSort['field'])
    ? { field: sortField as ParcelSort['field'], direction: p.get('sortDir') === 'asc' ? 'asc' : 'desc' }
    : undefined;

  const limit = Math.min(Number(p.get('limit')) || 500, 10_000);
  const offset = Number(p.get('offset')) || 0;

  const result = queryParcels({ filters, sort, limit, offset });

  return NextResponse.json(result);
}
