'use client';

/**
 * Mobile mode — the self-service lookup (docs/04-APP3-DASHBOARD.md §3.3).
 * "Has my parcel arrived, and where is it?" — one search field, chips,
 * stacked cards.
 *
 * There is no login system in this demo, so "Find my parcels" is adapted as
 * a one-tap recipient shortcut rather than reading a signed-in session — the
 * same UX outcome (filter to one name in one tap) without inventing an auth
 * layer the brief never asked for.
 */

import { useEffect, useState } from 'react';
import { useDashboardFilters } from '../../../hooks/useDashboardFilters';
import { useParcels } from '../../../hooks/useParcels';
import { useParcelStream } from '../../../hooks/useParcelStream';
import { useDashboardMeta } from '../../../hooks/useDashboardMeta';
import { ParcelCard } from '../../../design/components/ParcelCard';
import { ModeSwitcher } from '../../../design/components/ModeSwitcher';
import { LiveBadge } from '../../../design/components/LiveBadge';
import { Chip } from '../../../design/components/Card';
import { Button } from '../../../design/components/Button';
import { DetailDrawer } from '../../../design/components/DetailDrawer';

const QUICK_PEOPLE = ['John Doe', 'Bob Builder', 'Sarah Connor', 'Alice Wonderland'];

export function MobileClient() {
  const { filters, update, clearAll, apiQueryString, activeCount } = useDashboardFilters();
  const [selected, setSelected] = useState<string | null>(null);
  const { rows, total, loading, setRows, refetch } = useParcels(apiQueryString);
  const meta = useDashboardMeta();
  const status = useParcelStream((event) => {
    setRows((prev) => [event.parcel, ...prev.filter((p) => p.trackingId !== event.parcel.trackingId)]);
  });

  useEffect(() => {
    const reconcile = setInterval(refetch, 30_000);
    return () => clearInterval(reconcile);
  }, [refetch]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)', color: 'var(--content-primary)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ font: 'var(--text-h3)', color: 'var(--content-brand)' }}>BOSCH Parcels</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <LiveBadge status={status} />
            <ModeSwitcher />
          </div>
        </div>
        <input
          type="search"
          placeholder="Search tracking ID, recipient or location"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          style={{
            height: 'var(--target-min)',
            padding: `0 var(--space-4)`,
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-default)',
            background: 'var(--surface-sunken)',
            color: 'var(--content-primary)',
            font: 'var(--text-body)',
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <span style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)', alignSelf: 'center' }}>
            Find my parcels:
          </span>
          {QUICK_PEOPLE.map((name) => (
            <Chip
              key={name}
              active={filters.recipient === name}
              onClick={() => update({ recipient: filters.recipient === name ? '' : name })}
            >
              {name}
            </Chip>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {(['STORED', 'IN_TRANSIT', 'DELIVERED'] as const).map((s) => (
            <Chip
              key={s}
              active={filters.status.includes(s)}
              onClick={() =>
                update({ status: filters.status.includes(s) ? filters.status.filter((x) => x !== s) : [...filters.status, s] })
              }
            >
              {s}
            </Chip>
          ))}
          {meta.carriers.map((c) => (
            <Chip
              key={c}
              active={filters.carrier.includes(c)}
              onClick={() =>
                update({ carrier: filters.carrier.includes(c) ? filters.carrier.filter((x) => x !== c) : [...filters.carrier, c] })
              }
            >
              {c}
            </Chip>
          ))}
          {activeCount > 0 && (
            <Button variant="ghost" size="compact" onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>
        <span className="tabular" style={{ font: 'var(--text-caption)', color: 'var(--content-secondary)' }}>
          {loading ? 'Loading…' : `${total} parcels`}
        </span>
      </header>

      <main style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-16) var(--space-4)' }}>
            <span style={{ font: 'var(--text-h3)' }}>No parcels match these filters</span>
            <Button variant="secondary" onClick={clearAll}>
              Clear filters
            </Button>
          </div>
        ) : (
          rows.map((row) => <ParcelCard key={row.trackingId} parcel={row} onClick={() => setSelected(row.trackingId)} />)
        )}
      </main>

      {selected && <DetailDrawer trackingId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
