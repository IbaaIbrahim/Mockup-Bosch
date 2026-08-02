import { NextResponse } from 'next/server';
import { getParcelDetail } from '../../../../server/parcels-repo';

export async function GET(_request: Request, { params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await params;
  const detail = getParcelDetail(trackingId);
  if (!detail) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
  return NextResponse.json(detail);
}
