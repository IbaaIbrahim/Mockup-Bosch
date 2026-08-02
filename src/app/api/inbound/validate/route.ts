import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateTrackingScan } from '../../../../server/inbound-service';

const BodySchema = z.object({ raw: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'raw is required' }, { status: 400 });

  const result = validateTrackingScan(parsed.data.raw);
  return NextResponse.json(result);
}
