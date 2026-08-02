'use client';

import type { ParcelRow } from '../../lib/dashboard-types';
import { CarrierBadge } from './CarrierBadge';
import { StatusPill } from './StatusPill';

const LOCATION_ICON: Record<string, string> = { RACK: '▤', TROLLEY: '▭', STAGING: '◱' };

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ParcelCard({
  parcel,
  justArrived = false,
  onClick,
}: {
  parcel: ParcelRow;
  justArrived?: boolean;
  onClick?: () => void;
}) {
  const isMilkrun = parcel.sourceSystem !== 'INBOUND_APP';

  return (
    <div
      onClick={onClick}
      className={justArrived ? 'row-arrive' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-raised)',
        border: `1px solid ${isMilkrun ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        boxShadow: 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : undefined,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <span
          className="mono"
          style={{
            font: 'var(--text-mono)',
            color: 'var(--content-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={parcel.trackingId}
        >
          {parcel.trackingId}
        </span>
        <StatusPill status={parcel.status} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CarrierBadge carrier={parcel.carrier} />
        {isMilkrun && (
          <span style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}>
            {parcel.sourceSystem === 'MILKRUN' ? 'Milkrun' : 'Internal'}
          </span>
        )}
      </div>

      <div
        className="mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          font: 'var(--text-mono)',
          color: 'var(--content-secondary)',
        }}
      >
        <span aria-hidden>{LOCATION_ICON[parcel.locationType ?? ''] ?? '·'}</span>
        {parcel.actualLocation ?? '—'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span
          style={{
            font: 'var(--text-body-sm)',
            color: 'var(--content-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {parcel.recipientName ?? 'Unassigned'}
          {parcel.recipientDepartment && (
            <span style={{ color: 'var(--content-tertiary)' }}> · {parcel.recipientDepartment}</span>
          )}
        </span>
        <time
          dateTime={parcel.timestampLastEvent}
          title={new Date(parcel.timestampLastEvent).toISOString()}
          style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)', whiteSpace: 'nowrap' }}
        >
          {formatRelative(parcel.timestampLastEvent)}
        </time>
      </div>
    </div>
  );
}
