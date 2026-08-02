'use client';

/**
 * Inbox view (docs/03-APP2-INBOUND.md §7.1, deviation D7): renders the mock
 * SMTP sink so a dispatched notification can be shown on the projector
 * seconds after a parcel is stored — stronger for a live demo than merely
 * asserting the email was sent.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppBar } from '../../../design/components/AppBar';
import { Card, EmptyState } from '../../../design/components/Card';

interface InboxEmail {
  emailId: number;
  toAddress: string;
  subject: string;
  body: string;
  sentAt: string;
  context: Record<string, unknown> | null;
}

const POLL_MS = 4000;

export function InboxClient() {
  const router = useRouter();
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/inbox')
        .then((res) => res.json())
        .then((data: { emails: InboxEmail[] }) => {
          if (!cancelled) setEmails(data.emails);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      <AppBar title="Inbox" onBack={() => router.push('/inbound')} />
      <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {!loading && emails.length === 0 && (
          <EmptyState title="No mail yet" description="Notifications appear here as soon as a rack-stored parcel with a known recipient email is dispatched." />
        )}
        {emails.map((email) => (
          <Card key={email.emailId}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <span style={{ font: 'var(--text-label)' }}>{email.subject}</span>
                <time
                  dateTime={email.sentAt}
                  style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)', whiteSpace: 'nowrap' }}
                >
                  {new Date(email.sentAt).toLocaleString('en-GB')}
                </time>
              </div>
              <span style={{ font: 'var(--text-caption)', color: 'var(--content-secondary)' }}>To: {email.toAddress}</span>
              <p style={{ font: 'var(--text-body-sm)', color: 'var(--content-primary)', margin: 0 }}>{email.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
