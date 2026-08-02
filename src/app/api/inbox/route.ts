import { NextResponse } from 'next/server';
import { listInbox } from '../../../adapters/smtp';

/** Renders the SMTP mock sink so a dispatched email can be shown on the projector seconds after a parcel is stored. */
export async function GET() {
  return NextResponse.json({ emails: listInbox(100) });
}
