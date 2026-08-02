import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllLocations, registerLocation } from '../../../../server/locations-repo';
import { logOpsEvent } from '../../../../server/ops-events-repo';

export async function GET() {
  return NextResponse.json({ locations: getAllLocations() });
}

const BodySchema = z.object({
  locationId: z.string().min(1),
  locationType: z.enum(['RACK', 'TROLLEY', 'STAGING']),
  assignedDepartment: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
});

/**
 * Live location registration — risk R4 (docs/09-SCOPE-CONFERENCE-DEMO.md
 * §10): "their QR encodes an unexpected value." Demo-mode admin affordance
 * offered from the "Unknown location code" wash (docs/03-APP2-INBOUND.md §6).
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid location payload' }, { status: 400 });

  const location = registerLocation(parsed.data);
  logOpsEvent({
    kind: 'LOCATION_REGISTERED',
    decision: 'OK',
    reason: `Admin registered ${location.locationId} (${location.locationType}) live`,
  });

  return NextResponse.json({ location });
}
