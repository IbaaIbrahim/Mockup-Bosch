import { NextResponse } from 'next/server';
import { listOpsEvents } from '../../../../server/ops-events-repo';

export async function GET() {
  return NextResponse.json({ events: listOpsEvents(300) });
}
