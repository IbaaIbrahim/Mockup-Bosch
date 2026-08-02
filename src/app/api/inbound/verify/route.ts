import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyLocationScan } from '../../../../server/inbound-service';

const BodySchema = z.object({
  proposedLocationId: z.string().min(1),
  rawScan: z.string(),
});

/**
 * §3.2.4 C, implemented literally: MISMATCH is a hard block, not an error to
 * recover from with an override. The client has no code path that skips this.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'proposedLocationId and rawScan are required' }, { status: 400 });

  const result = verifyLocationScan(parsed.data.proposedLocationId, parsed.data.rawScan);
  return NextResponse.json(result);
}
