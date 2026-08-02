'use client';

/**
 * DemoShortcuts — stage aid, not product surface.
 *
 * On stage there is no time to thumb an 18-character tracking ID into a phone,
 * and a typo mid-presentation reads as a bug. These buttons pre-fill the field
 * with a known-good or known-bad value; they deliberately do NOT submit, so
 * the audience sees the value land in the input before the operator commits.
 *
 * They are an input convenience only. Every value still goes through the same
 * API and the same engine rules as a camera scan — the "unhappy" button is not
 * a shortcut to the red screen, it is a shortcut to typing a bad value.
 */

import type { CSSProperties } from 'react';

export interface DemoShortcut {
  /** What the button does, in the operator's language — e.g. "Invalid label". */
  label: string;
  /** The value dropped into the field. */
  value: string;
  /** `happy` = the value the demo script expects to succeed. */
  tone: 'happy' | 'unhappy';
}

const TONE_STYLE: Record<DemoShortcut['tone'], CSSProperties> = {
  happy: {
    background: 'var(--status-success-surface)',
    color: 'var(--status-success-fg)',
    border: '1.5px solid var(--status-success-border)',
  },
  unhappy: {
    background: 'var(--status-error-surface)',
    color: 'var(--status-error-fg)',
    border: '1.5px solid var(--status-error-border)',
  },
};

export function DemoShortcuts({
  shortcuts,
  onPick,
}: {
  shortcuts: DemoShortcut[];
  onPick: (value: string) => void;
}) {
  if (shortcuts.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px dashed var(--border-subtle)',
        background: 'var(--surface-sunken)',
      }}
    >
      <span style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}>
        Demo examples — fills the field above, does not submit
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.value}
            type="button"
            onClick={() => onPick(shortcut.value)}
            style={{
              flex: '1 1 12rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 'var(--space-1)',
              minHeight: 'var(--target-min)',
              padding: `var(--space-2) var(--space-3)`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              ...TONE_STYLE[shortcut.tone],
            }}
          >
            <span style={{ font: 'var(--text-label)' }}>{shortcut.label}</span>
            <span className="mono" style={{ opacity: 0.85, wordBreak: 'break-all' }}>
              {shortcut.value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
