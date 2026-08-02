import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lookupSapOrder } from '../../../../server/inbound-service';
import { SAP_PO_LENGTH } from '../../../../engine/recipient-resolution';

const BodySchema = z.object({ poNumber: z.string().length(SAP_PO_LENGTH).regex(/^[0-9]+$/) });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ found: false, message: `SAP PO number must be exactly ${SAP_PO_LENGTH} digits.` }, { status: 400 });
  }

  const result = await lookupSapOrder(parsed.data.poNumber);
  return NextResponse.json(result);
}
