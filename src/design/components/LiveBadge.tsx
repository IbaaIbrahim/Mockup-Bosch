import type { StreamStatus } from '../../hooks/useParcelStream';

const CONFIG: Record<StreamStatus, { label: string; color: string }> = {
  live: { label: 'LIVE', color: 'var(--status-success-fg)' },
  connecting: { label: 'CONNECTING', color: 'var(--content-tertiary)' },
  reconnecting: { label: 'RECONNECTING', color: 'var(--status-warning-fg)' },
};

/** Bound to the real SSE connection state — docs/04-APP3-DASHBOARD.md §3.1: "honest status beats a decorative badge." */
export function LiveBadge({ status }: { status: StreamStatus }) {
  const cfg = CONFIG[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        font: 'var(--text-overline)',
        letterSpacing: 'var(--tracking-overline)',
        color: cfg.color,
      }}
    >
      <span
        aria-hidden
        className={status === 'live' ? 'pulse-dot' : undefined}
        style={{ width: '0.5rem', height: '0.5rem', borderRadius: 'var(--radius-full)', background: 'currentColor' }}
      />
      {cfg.label}
    </span>
  );
}
