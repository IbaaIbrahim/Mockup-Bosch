/**
 * KpiTile — docs/01-DESIGN-SYSTEM.md §6.7. Large tabular number, label,
 * optional alert tone. Colours are token references, so this reads correctly
 * in both light (table/mobile) and dark (board) contexts without a `dark`
 * prop — the CSS custom properties themselves flip under `[data-theme=dark]`.
 */
export function KpiTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'alert';
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        padding: 'var(--space-5)',
      }}
    >
      <span
        className="tabular"
        style={{
          font: 'var(--text-display)',
          letterSpacing: 'var(--tracking-display)',
          color: tone === 'alert' ? 'var(--status-warning-fg)' : 'var(--content-primary)',
        }}
      >
        {value}
      </span>
      <span
        style={{
          font: 'var(--text-overline)',
          letterSpacing: 'var(--tracking-overline)',
          textTransform: 'uppercase',
          color: 'var(--content-secondary)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
