const CARRIER_COLOR: Record<string, string> = {
  DHL: 'var(--bosch-yellow-500)',
  UPS: 'var(--bosch-purple-500)',
  GLS: 'var(--bosch-blue-500)',
  Amazon: 'var(--bosch-turquoise)',
  'Internal Milkrun': 'var(--grey-500)',
  'Internal Transfer': 'var(--grey-500)',
};

export function CarrierBadge({ carrier }: { carrier: string }) {
  const color = CARRIER_COLOR[carrier] ?? 'var(--grey-500)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span
        aria-hidden
        style={{
          width: '0.625rem',
          height: '0.625rem',
          borderRadius: 'var(--radius-full)',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ font: 'var(--text-label)' }}>{carrier}</span>
    </span>
  );
}
