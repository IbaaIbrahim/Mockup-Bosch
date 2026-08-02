import { NextResponse } from 'next/server';
import { z } from 'zod';
import { finalizeRegistration } from '../../../../server/inbound-service';

const BodySchema = z.object({
  trackingId: z.string().min(1),
  carrier: z.string().min(1),
  sapPoNumber: z.string().nullable(),
  recipientName: z.string().nullable(),
  recipientDepartment: z.string().nullable(),
  recipientEmail: z.string().nullable(),
  proposedLocation: z.string().min(1),
  actualLocation: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid finalisation payload', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await finalizeRegistration(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    // Most likely a duplicate tracking ID (UNIQUE constraint) — surfaced as a
    // designed state, not a stack trace reaching the operator.
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Finalisation failed' }, { status: 409 });
  }
}
