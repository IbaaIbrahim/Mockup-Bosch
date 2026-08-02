'use client';

/**
 * Step 3 — location verification (docs/03-APP2-INBOUND.md §6). The single
 * most important interaction in the demo: MISMATCH is a hard block. There is
 * deliberately no prop, no state, and no code path here that lets the
 * operator proceed, go back, or skip on a mismatch — only "Scan again",
 * which re-renders this exact screen. Do not add one.
 *
 * Gates C10 (mismatch, hard block), C11 (match, proceed), C12 (unknown code).
 */

import { useCallback, useEffect, useState } from 'react';
import { Scanner } from '../../../design/components/Scanner';
import { StateWash, ExpectedVsScanned } from '../../../design/components/StateWash';
import { Chip } from '../../../design/components/Card';
import type { DemoShortcut } from '../../../design/components/DemoShortcuts';

type LocationType = 'RACK' | 'TROLLEY' | 'STAGING';

/**
 * A known rack that is never the proposal, so it produces a genuine MISMATCH
 * (the C10 hard block) rather than the UNKNOWN_LOCATION screen — the demo
 * needs expected-vs-scanned, not "code not recognised". RACK-A-04 is the
 * standby for the vanishingly unlikely case that RACK-C-12 is the proposal.
 */
const WRONG_RACK = 'RACK-C-12';
const WRONG_RACK_ALTERNATIVE = 'RACK-A-04';

function locationExamples(proposedLocationId: string): DemoShortcut[] {
  const wrong = proposedLocationId === WRONG_RACK ? WRONG_RACK_ALTERNATIVE : WRONG_RACK;
  return [
    { label: 'Wrong location', value: wrong, tone: 'unhappy' },
    // Always the live proposal, so the button stays correct after a storage
    // marks a rack occupied and the cascade moves on (npm run demo:reset puts
    // it back to RACK-A-05).
    { label: 'Correct location', value: proposedLocationId, tone: 'happy' },
  ];
}

type VerifyResult =
  | { status: 'MATCH'; scanned: string; expected: string; message: string }
  | { status: 'MISMATCH'; scanned: string; expected: string; message: string }
  | { status: 'UNKNOWN_LOCATION'; scanned: string; expected: string; message: string }
  | { status: 'EMPTY'; scanned: string; expected: string; message: string };

export function LocationScanScreen({
  proposedLocationId,
  onVerified,
  onMismatchActive,
}: {
  proposedLocationId: string;
  onVerified: (actualLocation: string) => void;
  /** Lets the parent hide/disable Back while a hard block is on screen. */
  onMismatchActive: (active: boolean) => void;
}) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [registerForm, setRegisterForm] = useState<{ locationId: string; type: LocationType } | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    onMismatchActive(result?.status === 'MISMATCH');
    return () => onMismatchActive(false);
  }, [result, onMismatchActive]);

  const verify = useCallback(
    async (rawScan: string) => {
      const res = await fetch('/api/inbound/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedLocationId, rawScan }),
      });
      const data: VerifyResult = await res.json();
      setResult(data);
    },
    [proposedLocationId],
  );

  const rescan = () => setResult(null);

  if (result?.status === 'MATCH') {
    return (
      <StateWash
        tone="success"
        headline="Location verified!"
        detail={`You can now place the parcel in ${result.expected}.`}
        primaryAction={{ label: 'Next', onClick: () => onVerified(result.scanned) }}
      />
    );
  }

  if (result?.status === 'MISMATCH') {
    return (
      <StateWash
        tone="error"
        headline="Wrong location!"
        detail={<ExpectedVsScanned expected={result.expected} scanned={result.scanned} />}
        primaryAction={{ label: 'Scan again', onClick: rescan }}
      />
    );
  }

  if (result?.status === 'UNKNOWN_LOCATION') {
    const detail = registerForm ? (
      <RegisterLocationForm
        locationId={registerForm.locationId}
        type={registerForm.type}
        onTypeChange={(type) => setRegisterForm({ ...registerForm, type })}
      />
    ) : (
      `"${result.scanned}" is not a known storage location.`
    );

    return (
      <StateWash
        tone="error"
        headline="Unknown location code"
        detail={detail}
        monoDetail={registerForm ? undefined : result.scanned}
        primaryAction={
          registerForm
            ? {
                label: registering ? 'Registering…' : 'Register & verify',
                onClick: async () => {
                  if (registering) return;
                  setRegistering(true);
                  try {
                    await fetch('/api/admin/locations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        locationId: registerForm.locationId,
                        locationType: registerForm.type,
                      }),
                    });
                    await verify(registerForm.locationId);
                    setRegisterForm(null);
                  } finally {
                    setRegistering(false);
                  }
                },
              }
            : { label: 'Scan again', onClick: rescan }
        }
        secondaryAction={
          registerForm
            ? { label: 'Cancel', onClick: () => setRegisterForm(null) }
            : { label: 'Register this location (demo)', onClick: () => setRegisterForm({ locationId: result.scanned, type: 'RACK' }) }
        }
      />
    );
  }

  if (result?.status === 'EMPTY') {
    return (
      <StateWash
        tone="error"
        headline="Nothing scanned"
        detail="Please try again."
        primaryAction={{ label: 'Scan again', onClick: rescan }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-5)' }}>
      <h2 style={{ font: 'var(--text-h2)', margin: 0, textAlign: 'center' }}>Scan the location QR code</h2>
      <Scanner
        instruction={`Scan the QR code at ${proposedLocationId}`}
        manualLabel="Or enter the location code manually"
        manualPlaceholder={proposedLocationId}
        onDetect={verify}
        demoShortcuts={locationExamples(proposedLocationId)}
      />
    </div>
  );
}

/** Demo-mode "register this location live" affordance — risk R4. */
function RegisterLocationForm({
  locationId,
  type,
  onTypeChange,
}: {
  locationId: string;
  type: LocationType;
  onTypeChange: (type: LocationType) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', textAlign: 'left', width: '100%' }}>
      <span style={{ font: 'var(--text-body-sm)' }}>
        Register <span className="mono">{locationId}</span> as:
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
        {(['RACK', 'TROLLEY', 'STAGING'] as const).map((t) => (
          <Chip key={t} active={type === t} onClick={() => onTypeChange(t)}>
            {t}
          </Chip>
        ))}
      </div>
    </div>
  );
}
