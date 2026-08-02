'use client';

/**
 * Location proposal screen (docs/03-APP2-INBOUND.md §5.1). The
 * "Why this location?" affordance renders the cascade trace in plain
 * language — transparency that costs one component.
 */

import { useState } from 'react';
import { Button } from '../../../design/components/Button';
import type { CascadeTraceStep, ProposedLocation } from '../wizard-types';

const LOCATION_LABEL: Record<ProposedLocation['locationType'], string> = {
  RACK: 'Rack',
  TROLLEY: 'Trolley',
  STAGING: 'Staging',
};

export function ProposalScreen({
  recipientName,
  department,
  location,
  reason,
  trace,
  orderCompletedPoNumber,
  onScanLocation,
}: {
  recipientName: string | null;
  department: string | null;
  location: ProposedLocation;
  reason?: string;
  trace?: CascadeTraceStep[];
  /** PDF §4.2: order_status COMPLETED — "accept but show an informational chip." */
  orderCompletedPoNumber?: string;
  onScanLocation: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-5)' }}>
      {orderCompletedPoNumber && (
        <span
          style={{
            alignSelf: 'center',
            padding: `var(--space-1) var(--space-3)`,
            borderRadius: 'var(--radius-full)',
            background: 'var(--status-info-surface)',
            color: 'var(--status-info-fg)',
            font: 'var(--text-caption)',
          }}
        >
          Order completed {orderCompletedPoNumber}
        </span>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Row label="Recipient" value={recipientName ?? 'N/A'} />
        <Row label="Department" value={department ?? '—'} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--surface-sunken)',
        }}
      >
        <span style={{ font: 'var(--text-overline)', color: 'var(--content-tertiary)', letterSpacing: 'var(--tracking-overline)' }}>
          GO TO
        </span>
        <span className="mono" style={{ font: 'var(--text-display)', letterSpacing: 'var(--tracking-mono)' }}>
          {location.locationId}
        </span>
        <span style={{ font: 'var(--text-body-sm)', color: 'var(--content-secondary)' }}>
          {LOCATION_LABEL[location.locationType]}
          {location.displayName ? ` · ${location.displayName}` : ''}
        </span>
      </div>

      {reason && (
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--content-link)',
            font: 'var(--text-body-sm)',
            textAlign: 'left',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {showWhy ? 'Hide' : 'Why this location?'}
        </button>
      )}

      {showWhy && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p style={{ font: 'var(--text-body-sm)', color: 'var(--content-secondary)', margin: 0 }}>{reason}</p>
          {trace?.map((step) => (
            <div
              key={step.priority}
              style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)', display: 'flex', gap: 'var(--space-2)' }}
            >
              <span>P{step.priority}</span>
              <span>{step.label}:</span>
              <span>{step.note}</span>
            </div>
          ))}
        </div>
      )}

      <Button variant="primary" size="primary" fullWidth onClick={onScanLocation}>
        Scan Location
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ font: 'var(--text-label)', color: 'var(--content-secondary)' }}>{label}</span>
      <span style={{ font: 'var(--text-body)', color: 'var(--content-primary)' }}>{value}</span>
    </div>
  );
}
