import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addCarrierPattern, getAllCarrierFormats } from '../../../../server/carrier-formats-repo';
import { logOpsEvent } from '../../../../server/ops-events-repo';

export async function GET() {
  return NextResponse.json({ formats: getAllCarrierFormats() });
}

const BodySchema = z.object({
  carrier: z.string().min(1),
  pattern: z.string().min(1),
});

/** Live pattern add — gate C3: "An unsupported carrier appears live → Admin → add pattern → rescan works, under 20 seconds." */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: 'carrier and pattern are required' }, { status: 400 });

  const result = addCarrierPattern(parsed.data);
  if (!result.ok) return NextResponse.json(result, { status: 422 });

  logOpsEvent({
    kind: 'CARRIER_PATTERN_ADDED',
    decision: 'OK',
    reason: `Added live pattern for ${result.format.carrier}: ${result.format.pattern}`,
  });

  return NextResponse.json(result);
}
