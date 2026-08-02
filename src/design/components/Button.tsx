'use client';

/**
 * Button — docs/01-DESIGN-SYSTEM.md §6.1.
 *
 * Disabled state ALWAYS carries a reason: CLAUDE.md — "Every disabled control
 * explains why it is disabled." A silently disabled button is a demo dead
 * end (the 10-digit SAP PO field and the wizard's Next button both depend on
 * this).
 *
 * Colour, spacing, radius and duration are all `var(--token)` references —
 * no raw hex, px or duration values (CLAUDE.md rule 5).
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'ai';

const VARIANT_STYLE: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--action-primary-bg)',
    color: 'var(--action-primary-fg)',
    border: '1.5px solid transparent',
    boxShadow: 'var(--shadow-sm)',
  },
  secondary: {
    background: 'var(--action-secondary-bg)',
    color: 'var(--action-secondary-fg)',
    border: '1.5px solid var(--action-secondary-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--action-secondary-fg)',
    border: '1.5px solid transparent',
  },
  danger: {
    background: 'var(--bosch-red-600)',
    color: 'var(--action-primary-fg)',
    border: '1.5px solid transparent',
  },
  success: {
    background: 'var(--bosch-green-500)',
    color: 'var(--action-primary-fg)',
    border: '1.5px solid transparent',
  },
  ai: {
    background: 'var(--ai-surface)',
    color: 'var(--ai-accent)',
    border: '1.5px solid var(--ai-accent)',
  },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Required whenever `disabled` is true — surfaced as a helper line and title. */
  disabledReason?: string;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'default' | 'primary' | 'compact';
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    disabledReason,
    loading = false,
    fullWidth = false,
    size = 'default',
    icon,
    disabled,
    children,
    style,
    className,
    ...rest
  },
  ref,
) {
  const height =
    size === 'primary' ? 'var(--target-primary)' : size === 'compact' ? 'var(--target-compact)' : 'var(--target-min)';

  const isDisabled = Boolean(disabled) || loading;

  return (
    <span
      style={{ display: fullWidth ? 'block' : 'inline-flex', width: fullWidth ? '100%' : undefined }}
    >
      <button
        ref={ref}
        disabled={isDisabled}
        title={isDisabled && disabledReason ? disabledReason : undefined}
        aria-disabled={isDisabled}
        aria-describedby={isDisabled && disabledReason ? `${rest.id ?? 'btn'}-disabled-reason` : undefined}
        className={className}
        style={{
          height,
          width: fullWidth ? '100%' : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          padding: `0 var(--space-6)`,
          borderRadius: 'var(--radius-md)',
          font: 'var(--text-label)',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: `transform var(--duration-instant) var(--ease-out), opacity var(--duration-fast) var(--ease-out)`,
          opacity: isDisabled ? 1 : undefined,
          ...(isDisabled
            ? { background: 'var(--action-disabled-bg)', color: 'var(--action-disabled-fg)', border: '1.5px solid transparent' }
            : VARIANT_STYLE[variant]),
          ...style,
        }}
        onMouseDown={(e) => {
          if (!isDisabled) e.currentTarget.style.transform = 'scale(0.97)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        {loading ? (
          <span
            aria-hidden
            style={{
              width: '1.25rem',
              height: '1.25rem',
              borderRadius: 'var(--radius-full)',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              animation: `spin var(--duration-deliberate) linear infinite`,
            }}
          />
        ) : (
          icon
        )}
        {!loading && children}
      </button>
      {isDisabled && disabledReason && (
        <span
          id={`${rest.id ?? 'btn'}-disabled-reason`}
          style={{
            display: 'block',
            marginTop: 'var(--space-2)',
            font: 'var(--text-caption)',
            color: 'var(--content-secondary)',
          }}
        >
          {disabledReason}
        </span>
      )}
    </span>
  );
});
