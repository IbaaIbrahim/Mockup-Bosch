/**
 * StatusPill — docs/01-DESIGN-SYSTEM.md §6.5.
 *
 * Colour is never the only signal (§8 accessibility): a dot shape and a word,
 * always both.
 */

import type { ParcelStatus } from '../../engine/types';

const CONFIG: Record<ParcelStatus, { label: string; surface: string; fg: string; pulse: boolean }> = {
  STORED: { label: 'Stored', surface: 'var(--status-success-surface)', fg: 'var(--status-success-fg)', pulse: false },
  IN_TRANSIT: { label: 'In Transit', surface: 'var(--status-info-surface)', fg: 'var(--status-info-fg)', pulse: true },
  DELIVERED: { label: 'Delivered', surface: 'var(--status-neutral-surface)', fg: 'var(--status-neutral-fg)', pulse: false },
};

export function StatusPill({ status }: { status: ParcelStatus }) {
  const cfg = CONFIG[status];
  return (
    <span
      className="tabular"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        height: '1.5rem',
        padding: `0 var(--space-3)`,
        borderRadius: 'var(--radius-full)',
        background: cfg.surface,
        color: cfg.fg,
        font: 'var(--text-overline)',
        letterSpacing: 'var(--tracking-overline)',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        className={cfg.pulse ? 'pulse-dot' : undefined}
        style={
          status === 'DELIVERED'
            ? {
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: 'var(--radius-full)',
                background: 'transparent',
                border: '1.5px solid currentColor',
                boxSizing: 'border-box',
              }
            : {
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: 'var(--radius-full)',
                background: 'currentColor',
              }
        }
      />
      {cfg.label}
    </span>
  );
}
