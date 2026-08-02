'use client';

/**
 * StateWash — the full-viewport red/green/amber state layer.
 *
 * PDF §3.2.2.1: "The screen turns red…" / "The screen turns green…" — taken
 * literally as a full-screen wash, not a toast (docs/01-DESIGN-SYSTEM.md §2.4).
 * Success washes auto-advance; error washes never do — CLAUDE.md: the wrong
 * scan is a hard block with no way forward except rescanning.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export type WashTone = 'success' | 'error' | 'warning';

const ICON: Record<WashTone, string> = { success: '✓', error: '!', warning: '⏱' };

export interface StateWashProps {
  tone: WashTone;
  headline: string;
  detail?: ReactNode;
  monoDetail?: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Success washes auto-advance after this many ms; omit to require a tap. */
  autoAdvanceMs?: number;
}

export function StateWash({
  tone,
  headline,
  detail,
  monoDetail,
  primaryAction,
  secondaryAction,
  autoAdvanceMs,
}: StateWashProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(tone === 'success' ? 40 : tone === 'error' ? [80, 60, 80] : 60);
    }
  }, [tone]);

  useEffect(() => {
    if (!autoAdvanceMs) return;
    const t = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        primaryAction.onClick();
      }
    }, autoAdvanceMs);
    return () => clearTimeout(t);
    // primaryAction is expected to be referentially stable enough per screen mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceMs]);

  const bg =
    tone === 'success'
      ? 'var(--status-success-bg)'
      : tone === 'error'
        ? 'var(--status-error-bg)'
        : 'var(--status-warning-bg)';
  const fg = tone === 'warning' ? 'var(--grey-900)' : 'var(--grey-0)';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="state-wash"
      style={{ background: bg, color: fg }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)', maxWidth: '28rem' }}>
        <span
          aria-hidden
          style={{
            width: '6rem',
            height: '6rem',
            borderRadius: 'var(--radius-full)',
            border: '3px solid currentColor',
            display: 'grid',
            placeItems: 'center',
            font: 'var(--text-display)',
            lineHeight: 1,
          }}
        >
          {ICON[tone]}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ font: 'var(--text-h1)', margin: 0 }}>{headline}</h2>
          {/* `detail` may be arbitrary content (e.g. ExpectedVsScanned renders a <div>),
              so this must be a <div>, not a <p> — a <p> cannot legally contain
              block-level children and React/hydration will complain if it does. */}
          {detail && <div style={{ font: 'var(--text-body-lg)', margin: 0, opacity: 0.92 }}>{detail}</div>}
          {monoDetail && (
            <p
              className="mono"
              style={{
                margin: 0,
                opacity: 0.75,
                userSelect: 'text',
                font: 'var(--text-mono)',
              }}
            >
              {monoDetail}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
          <Button
            variant="secondary"
            fullWidth
            size="primary"
            onClick={primaryAction.onClick}
            style={{ background: 'var(--grey-0)', color: 'var(--grey-900)', border: 'none' }}
          >
            {primaryAction.label}
          </Button>
          {secondaryAction && (
            <Button
              variant="ghost"
              fullWidth
              onClick={secondaryAction.onClick}
              style={{ color: 'currentColor' }}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Side-by-side expected/scanned comparison for the location mismatch wash (gate C10). */
export function ExpectedVsScanned({ expected, scanned }: { expected: string; scanned: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        width: '100%',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        background: 'rgb(255 255 255 / 0.12)',
      }}
    >
      <Row label="Expected" value={expected} />
      <div style={{ height: '1px', background: 'rgb(255 255 255 / 0.25)' }} />
      <Row label="Scanned" value={scanned} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)' }}>
      <span style={{ font: 'var(--text-overline)', letterSpacing: 'var(--tracking-overline)', opacity: 0.8 }}>
        {label}
      </span>
      <span className="mono" style={{ font: 'var(--text-mono-lg)', userSelect: 'text' }}>
        {value}
      </span>
    </div>
  );
}
