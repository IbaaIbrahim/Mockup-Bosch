/** ProgressStepper — thin segmented bar, one segment per wizard step (docs/01-DESIGN-SYSTEM.md §6.7). */
export function ProgressStepper({ current, total }: { current: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      style={{ display: 'flex', gap: 'var(--space-1)', padding: `0 var(--space-4)` }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: '0.25rem',
            borderRadius: 'var(--radius-full)',
            background: i < current ? 'var(--bosch-red-500)' : 'var(--surface-sunken)',
            transition: `background var(--duration-moderate) var(--ease-out)`,
          }}
        />
      ))}
    </div>
  );
}
