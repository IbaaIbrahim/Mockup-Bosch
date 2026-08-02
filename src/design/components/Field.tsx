'use client';

/**
 * Field — docs/01-DESIGN-SYSTEM.md §6.6.
 *
 * Label above (never placeholder-as-label). Numeric fields with a fixed
 * required length show a live counter — this is what makes the SAP PO
 * screen's disabled Next button self-explaining (gate C4).
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  errorText?: string;
  /** Renders "entered / required" beneath the input, e.g. "7 / 10". */
  counter?: { entered: number; required: number };
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, helperText, errorText, counter, id, style, ...rest },
  ref,
) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const hasError = Boolean(errorText);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label
        htmlFor={fieldId}
        style={{ font: 'var(--text-label)', color: 'var(--content-primary)' }}
      >
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={hasError}
        aria-describedby={hasError || helperText ? `${fieldId}-help` : undefined}
        style={{
          height: 'var(--target-min)',
          padding: `0 var(--space-4)`,
          borderRadius: 'var(--radius-md)',
          border: hasError ? '1.5px solid var(--status-error-bg)' : '1.5px solid var(--border-default)',
          background: 'var(--surface-raised)',
          color: 'var(--content-primary)',
          font: 'var(--text-body)',
          outline: 'none',
          ...style,
        }}
        {...rest}
      />
      {counter && (
        <span
          className="tabular"
          style={{
            font: 'var(--text-caption)',
            color: counter.entered === counter.required ? 'var(--status-success-fg)' : 'var(--content-secondary)',
          }}
        >
          {counter.entered} / {counter.required}
        </span>
      )}
      {(errorText || helperText) && (
        <span
          id={`${fieldId}-help`}
          style={{
            font: 'var(--text-caption)',
            color: hasError ? 'var(--status-error-fg)' : 'var(--content-secondary)',
          }}
        >
          {hasError ? errorText : helperText}
        </span>
      )}
    </div>
  );
});
