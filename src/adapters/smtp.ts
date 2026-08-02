/**
 * SMTP gateway adapter (PDF §3.2.4 D).
 *
 * Real interface — `send()` is exactly what a real SMTP/mail-API client
 * exposes, so swapping in an actual mail gateway is a one-line change at the
 * factory. The mock implementation writes to `mock_emails` instead of
 * dispatching over the network (deviation D7, docs/03-APP2-INBOUND.md §7.1):
 * an in-app Inbox view renders the received mail so it can be shown on the
 * projector seconds after a parcel is stored — stronger for a live demo than
 * asserting delivery happened.
 *
 * `listInbox()` is a mock-only affordance for that Inbox view, not part of
 * the adapter interface a real integration would need.
 */

import { desc } from 'drizzle-orm';
import { db } from '../db/client';
import { mockEmails } from '../db/schema';
import { adapterLatency } from './latency';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  context?: Record<string, unknown>;
}

export interface SmtpAdapter {
  send(params: SendEmailParams): Promise<void>;
}

export interface InboxEmail {
  emailId: number;
  toAddress: string;
  subject: string;
  body: string;
  sentAt: string;
  context: Record<string, unknown> | null;
}

export function createMockSmtpAdapter(): SmtpAdapter {
  return {
    async send({ to, subject, body, context }: SendEmailParams): Promise<void> {
      await adapterLatency();
      db.insert(mockEmails)
        .values({
          toAddress: to,
          subject,
          body,
          sentAt: new Date().toISOString(),
          context: context ? JSON.stringify(context) : null,
        })
        .run();
    },
  };
}

export const smtpAdapter: SmtpAdapter = createMockSmtpAdapter();

export function listInbox(limit = 50): InboxEmail[] {
  return db
    .select()
    .from(mockEmails)
    .orderBy(desc(mockEmails.sentAt))
    .limit(limit)
    .all()
    .map((row) => ({
      emailId: row.emailId,
      toAddress: row.toAddress,
      subject: row.subject,
      body: row.body,
      sentAt: row.sentAt,
      context: row.context ? (JSON.parse(row.context) as Record<string, unknown>) : null,
    }));
}
