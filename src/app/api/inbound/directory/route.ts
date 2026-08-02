import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveManualRecipient, searchDirectoryNames } from '../../../../server/inbound-service';

/** Type-ahead over known names (docs/03-APP2-INBOUND.md §4.3) — a UI convenience, not the AD-query decision itself. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const results = await searchDirectoryNames(q);
  return NextResponse.json({ results });
}

const BodySchema = z.object({ name: z.string().min(1) });

/**
 * Resolve the entered name. Gate C7: entering "Unknown" must perform no
 * Active Directory query at all — enforced inside resolveManualRecipient,
 * not here.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const resolved = await resolveManualRecipient(parsed.data.name);
  return NextResponse.json(resolved);
}
