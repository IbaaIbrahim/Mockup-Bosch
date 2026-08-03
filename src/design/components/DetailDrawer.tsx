'use client';

/**
 * DetailDrawer — docs/04-APP3-DASHBOARD.md §5.2. Full field set, event
 * timeline, and the dispatched email inline — "reinforces that this is a
 * platform with history, not a table dump."
 */

import { useEffect, useState } from 'react';
import { CarrierBadge } from './CarrierBadge';
import { StatusPill } from './StatusPill';
import { Button } from './Button';

interface ParcelEventRecord {
  eventPk: number;
  kind: string;
  payload: Record<string, unknown> | null;
  actor: string | null;
  createdAt: string;
}

interface ParcelDetail {
  parcel: {
    trackingId: string;
    carrier: string;
    sapPoNumber: string | null;
    recipientName: string | null;
    recipientDepartment: string | null;
    recipientEmail: string | null;
    proposedLocation: string | null;
    actualLocation: string | null;
    status: string;
    sourceSystem: string;
    timestampLastEvent: string;
    createdAt: string;
    locationType: string | null;
  };
  events: ParcelEventRecord[];
}

const EVENT_LABEL: Record<string, string> = {
  SCANNED: 'Scanned',
  RECIPIENT_RESOLVED: 'Recipient resolved',
  LOCATION_PROPOSED: 'Location proposed',
  LOCATION_VERIFIED: 'Location verified',
  LOCATION_MISMATCH: 'Location mismatch',
  STORED: 'Stored',
  EMAIL_SENT: 'Email sent',
  EMAIL_SKIPPED: 'Email skipped',
  PICKED_UP: 'Picked up',
};

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <span style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}>{label}</span>
      <span className={mono ? 'mono' : undefined} style={{ font: mono ? 'var(--text-mono)' : 'var(--text-body)' }}>
        {value}
      </span>
    </div>
  );
}

export function DetailDrawer({ trackingId, onClose }: { trackingId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ParcelDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/parcels/${encodeURIComponent(trackingId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trackingId]);

  const emailEvent = detail?.events.find((e) => e.kind === 'EMAIL_SENT');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-sheet)', display: 'flex', justifyContent: 'flex-end' }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'var(--surface-scrim)' }}
        aria-hidden
      />
      <aside
        style={{
          position: 'relative',
          width: 'min(28rem, 100%)',
          height: '100%',
          background: 'var(--surface-raised)',
          borderLeft: '1px solid var(--border-subtle)',
          overflowY: 'auto',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="mono" style={{ font: 'var(--text-mono-lg)', userSelect: 'text' }}>
            {trackingId}
          </span>
          <Button variant="ghost" size="compact" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        {loading && <span style={{ color: 'var(--content-secondary)' }}>Loading…</span>}

        {!loading && !detail && <span style={{ color: 'var(--content-secondary)' }}>Parcel not found.</span>}

        {detail && (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
              <CarrierBadge carrier={detail.parcel.carrier} />
              <StatusPill status={detail.parcel.status as 'STORED' | 'IN_TRANSIT' | 'DELIVERED'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field label="Recipient" value={detail.parcel.recipientName ?? 'Unassigned'} />
              <Field label="Department" value={detail.parcel.recipientDepartment ?? '—'} />
              <Field label="SAP PO" value={detail.parcel.sapPoNumber ?? '—'} mono />
              <Field label="Source" value={detail.parcel.sourceSystem} />
              <Field label="Proposed location" value={detail.parcel.proposedLocation ?? '—'} mono />
              <Field label="Actual location" value={detail.parcel.actualLocation ?? '—'} mono />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <span style={{ font: 'var(--text-h3)', color: 'var(--content-primary)' }}>Timeline</span>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {detail.events.map((e) => (
                  <li key={e.eventPk} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <span
                      aria-hidden
                      style={{
                        width: '0.625rem',
                        height: '0.625rem',
                        marginTop: '0.375rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--content-brand)',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ font: 'var(--text-body-sm)', color: 'var(--content-primary)' }}>
                        {EVENT_LABEL[e.kind] ?? e.kind}
                        {e.actor && <span style={{ color: 'var(--content-tertiary)' }}> · {e.actor}</span>}
                      </div>
                      <time
                        dateTime={e.createdAt}
                        className="tabular"
                        style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}
                      >
                        {new Date(e.createdAt).toLocaleString('en-GB')}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {emailEvent && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-sunken)',
                }}
              >
                <span style={{ font: 'var(--text-label)' }}>Notification sent</span>
                <span style={{ font: 'var(--text-body-sm)', color: 'var(--content-secondary)' }}>
                  To {String(emailEvent.payload?.to ?? detail.parcel.recipientEmail ?? '—')}
                </span>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
