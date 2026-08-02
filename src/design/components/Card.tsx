import type { HTMLAttributes, ReactNode } from 'react';

export function Card({
  children,
  interactive = false,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; interactive?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-5)',
        cursor: interactive ? 'pointer' : undefined,
        transition: `box-shadow var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-16) var(--space-8)',
        color: 'var(--content-secondary)',
      }}
    >
      <h3 style={{ font: 'var(--text-h3)', color: 'var(--content-primary)', margin: 0 }}>{title}</h3>
      {description && <p style={{ font: 'var(--text-body)', margin: 0, maxWidth: '32rem' }}>{description}</p>}
      {action}
    </div>
  );
}

export function Chip({
  children,
  active = false,
  onRemove,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  // Interactive chips (onClick, no onRemove) render as a real <button> so
  // they're keyboard-reachable (docs/01-DESIGN-SYSTEM.md §8) — a <span
  // onClick> has no implicit role and can't be tabbed to or activated with
  // Enter/Space. When onRemove is also present, the outer element stays a
  // <span> to avoid nesting a <button> inside a <button>; only the × control
  // is interactive in that case (no current caller combines both).
  const Tag = onClick && !onRemove ? 'button' : 'span';
  const tagProps = Tag === 'button' ? { type: 'button' as const } : {};

  return (
    <Tag
      onClick={onClick}
      {...tagProps}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        height: '2rem',
        padding: `0 var(--space-3)`,
        borderRadius: 'var(--radius-full)',
        font: 'var(--text-body-sm)',
        background: active ? 'var(--bosch-red-50)' : 'var(--surface-sunken)',
        color: active ? 'var(--content-brand)' : 'var(--content-secondary)',
        border: active ? '1.5px solid var(--bosch-red-300)' : '1.5px solid transparent',
        cursor: onClick ? 'pointer' : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove filter"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.125rem',
            height: '1.125rem',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'transparent',
            color: 'currentColor',
            cursor: 'pointer',
            font: 'var(--text-caption)',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </Tag>
  );
}
