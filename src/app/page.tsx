import Link from 'next/link';

// One way in to the dashboard — the dark card wall. Table and Mobile are
// reached from the mode switcher in its top-right corner, not from here.
const LINKS = [
  { href: '/board', title: 'Parcel Status Dashboard', description: 'Dark card wall. Table and Mobile views via the switcher, top right.' },
  { href: '/inbound', title: 'Inbound Registration', description: 'Scan → identify → propose → verify → store.' },
  { href: '/ops', title: 'Ops Console', description: 'Event feed, health, admin, reset.' },
  { href: '/inbound/inbox', title: 'Notification Inbox', description: 'Dispatched notifications, exactly as the recipient would receive them.' },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-8)',
        padding: 'var(--space-10)',
        maxWidth: '48rem',
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span style={{ font: 'var(--text-h2)', color: 'var(--content-brand)' }}>BOSCH §3.2 Demo</span>
        <p style={{ font: 'var(--text-body)', color: 'var(--content-secondary)', margin: 0 }}>
          Inbound Registration + Parcel Status Dashboard.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
              padding: 'var(--space-5)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
              textDecoration: 'none',
              color: 'var(--content-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ font: 'var(--text-h3)' }}>{link.title}</span>
            <span style={{ font: 'var(--text-body-sm)', color: 'var(--content-secondary)' }}>{link.description}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
