'use client';

/**
 * Step 1 — tracking number scan & format validation.
 * docs/03-APP2-INBOUND.md §3. Gates C1, C2, C3.
 */

import { useCallback, useState } from 'react';
import { Scanner } from '../../../design/components/Scanner';
import { StateWash } from '../../../design/components/StateWash';
import type { DemoShortcut } from '../../../design/components/DemoShortcuts';

const CARRIERS = ['DHL', 'UPS', 'GLS', 'Amazon'];

/**
 * Stage aids only — both values take the ordinary /api/inbound/validate path
 * and are judged by the engine's carrier patterns, exactly like a camera scan.
 * "xyzsweg222" matches no active pattern → Invalid Format!.
 * "JD1234567890123456" satisfies DHL's ^JD[0-9]{16}$ and is not in the seed,
 * so it is a clean first registration rather than a duplicate.
 */
const SCAN_EXAMPLES: DemoShortcut[] = [
  { label: 'Invalid label', value: 'xyzsweg222', tone: 'unhappy' },
  { label: 'Valid DHL label', value: 'JD1234567890123456', tone: 'happy' },
];

interface ValidateResponse {
  valid: boolean;
  raw: string;
  message: string;
  trackingId?: string;
  carrier?: string;
  normalised?: string;
  duplicate?: { status: string; timestampLastEvent: string; actualLocation: string | null };
}

export function ScanScreen({
  onValidated,
}: {
  onValidated: (trackingId: string, carrier: string) => void;
}) {
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [registerAnywayError, setRegisterAnywayError] = useState<string | null>(null);

  const handleDetect = useCallback(async (raw: string) => {
    setPending(true);
    try {
      const res = await fetch('/api/inbound/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      const data: ValidateResponse = await res.json();
      setResult(data);
    } finally {
      setPending(false);
    }
  }, []);

  const rescan = () => {
    setResult(null);
    setRegisterAnywayError(null);
  };

  if (result?.valid && result.duplicate) {
    return (
      <StateWash
        tone="warning"
        headline="Already registered"
        detail={`Stored on ${new Date(result.duplicate.timestampLastEvent).toLocaleDateString('en-GB')} at ${result.duplicate.actualLocation ?? 'unknown location'}.`}
        monoDetail={result.trackingId}
        primaryAction={{ label: 'Scan again', onClick: rescan }}
        secondaryAction={{
          label: registerAnywayError ?? 'Register anyway',
          onClick: () => {
            if (result.trackingId && result.carrier) {
              setRegisterAnywayError('This tracking ID is already stored and cannot be registered twice.');
            }
          },
        }}
      />
    );
  }

  if (result?.valid) {
    return (
      <StateWash
        tone="success"
        headline={result.trackingId ?? ''}
        detail={`from ${result.carrier} — successfully registered.`}
        primaryAction={{
          label: 'Next',
          onClick: () => onValidated(result.trackingId!, result.carrier!),
        }}
        autoAdvanceMs={1400}
      />
    );
  }

  if (result && !result.valid) {
    return (
      <StateWash
        tone="error"
        headline="Invalid Format!"
        detail={result.message.replace('Invalid Format! ', '')}
        monoDetail={result.normalised || result.raw}
        primaryAction={{ label: 'Scan again', onClick: rescan }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', textAlign: 'center' }}>
        <h2 style={{ font: 'var(--text-h2)', margin: 0 }}>Please scan the tracking number</h2>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {CARRIERS.map((c) => (
            <span
              key={c}
              style={{
                padding: `var(--space-1) var(--space-3)`,
                borderRadius: 'var(--radius-full)',
                background: 'var(--surface-sunken)',
                color: 'var(--content-secondary)',
                font: 'var(--text-caption)',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <Scanner
        instruction="Point the camera at the carrier label"
        manualLabel="Enter manually"
        manualPlaceholder="e.g. JD0123456789012345"
        onDetect={handleDetect}
        demoShortcuts={SCAN_EXAMPLES}
      />

      {pending && <span style={{ textAlign: 'center', color: 'var(--content-secondary)' }}>Checking…</span>}
    </div>
  );
}
