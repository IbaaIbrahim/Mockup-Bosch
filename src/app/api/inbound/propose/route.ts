import { NextResponse } from 'next/server';
import { z } from 'zod';
import { proposeStorageLocation } from '../../../../server/inbound-service';

const BodySchema = z.object({
  department: z.string().nullable(),
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'department and sessionId are required' }, { status: 400 });

  const outcome = proposeStorageLocation(parsed.data.department, parsed.data.sessionId);
  return NextResponse.json(outcome);
}
