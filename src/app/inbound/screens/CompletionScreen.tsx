'use client';

/**
 * Completion screen (docs/03-APP2-INBOUND.md §7.2). "Register next parcel"
 * is primary — it's what actually happens next in the real workflow.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../design/components/Button';

export function CompletionScreen({
  trackingId,
  actualLocation,
  emailSent,
  emailTo,
  startedAt,
  onRegisterNext,
}: {
  trackingId: string;
  actualLocation: string;
  emailSent: boolean;
  emailTo?: string;
  startedAt: string;
  onRegisterNext: () => void;
}) {
  const router = useRouter();
  const [elapsedS, setElapsedS] = useState(() => Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));

  useEffect(() => {
    setElapsedS(Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
  }, [startedAt]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-6)',
        minHeight: '70vh',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <span
        aria-hidden
        style={{
          width: '4rem',
          height: '4rem',
          borderRadius: 'var(--radius-full)',
          background: 'var(--status-success-surface)',
          color: 'var(--status-success-fg)',
          display: 'grid',
          placeItems: 'center',
          font: 'var(--text-h1)',
        }}
      >
        ✓
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <h2 style={{ font: 'var(--text-h2)', margin: 0 }}>Process completed successfully.</h2>
        <p style={{ font: 'var(--text-body)', color: 'var(--content-secondary)', margin: 0 }}>You can now close the app.</p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          padding: 'var(--space-5)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-sunken)',
          width: '100%',
          maxWidth: '24rem',
        }}
      >
        <Detail label="Tracking ID" value={trackingId} mono />
        <Detail label="Stored at" value={actualLocation} mono />
        <Detail
          label="Notification"
          value={emailSent ? `Sent to ${emailTo}` : 'No notification — stored on a transit trolley, or recipient unknown'}
        />
      </div>

      <span className="tabular" style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}>
        Completed in {elapsedS}s
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', maxWidth: '24rem' }}>
        <Button variant="primary" size="primary" fullWidth onClick={onRegisterNext}>
          Register next parcel
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push('/')}>
          Close App
        </Button>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
      <span style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}>{label}</span>
      <span className={mono ? 'mono' : undefined} style={{ font: mono ? 'var(--text-mono)' : 'var(--text-body-sm)' }}>
        {value}
      </span>
    </div>
  );
}
