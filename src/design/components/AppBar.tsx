'use client';

import type { ReactNode } from 'react';

export function AppBar({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-appbar)',
        height: 'var(--target-min)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: `0 var(--space-4)`,
        background: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 'var(--target-compact)',
            height: 'var(--target-compact)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--content-primary)',
            font: 'var(--text-h3)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
          }}
        >
          ←
        </button>
      )}
      <h1
        style={{
          flex: 1,
          font: 'var(--text-h3)',
          color: 'var(--content-primary)',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </h1>
      {action}
    </header>
  );
}
