'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MODES = [
  { href: '/board', label: 'Board' },
  { href: '/table', label: 'Table' },
  { href: '/mobile', label: 'Mobile' },
];

export function ModeSwitcher({ subtle = false }: { subtle?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      style={{
        display: 'inline-flex',
        gap: 'var(--space-1)',
        padding: 'var(--space-1)',
        borderRadius: 'var(--radius-full)',
        background: subtle ? 'rgb(255 255 255 / 0.06)' : 'var(--surface-sunken)',
      }}
    >
      {MODES.map((m) => {
        const active = pathname?.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '2rem',
              padding: `0 var(--space-3)`,
              borderRadius: 'var(--radius-full)',
              font: 'var(--text-caption)',
              textDecoration: 'none',
              color: active ? (subtle ? 'var(--grey-0)' : 'var(--content-brand)') : 'var(--content-secondary)',
              background: active ? (subtle ? 'rgb(255 255 255 / 0.16)' : 'var(--bosch-red-50)') : 'transparent',
            }}
          >
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
