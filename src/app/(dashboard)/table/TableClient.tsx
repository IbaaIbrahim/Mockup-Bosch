'use client';

/**
 * Table mode — the analyst view (docs/04-APP3-DASHBOARD.md §3.2). Dense,
 * sortable, filter rail. Not virtualised — the ~125-row seeded dataset
 * doesn't need it; see docs/04-APP3-DASHBOARD.md §9 for the (unimplemented,
 * stretch) 10k-row target.
 */

import { useEffect, useState } from 'react';
import { useDashboardFilters } from '../../../hooks/useDashboardFilters';
import { useParcels } from '../../../hooks/useParcels';
import { useParcelStream } from '../../../hooks/useParcelStream';
import { useDashboardMeta } from '../../../hooks/useDashboardMeta';
import { FilterRail } from '../../../design/components/FilterRail';
import { CarrierBadge } from '../../../design/components/CarrierBadge';
import { StatusPill } from '../../../design/components/StatusPill';
import { LiveBadge } from '../../../design/components/LiveBadge';
import { ModeSwitcher } from '../../../design/components/ModeSwitcher';
import { Chip } from '../../../design/components/Card';
import { Button } from '../../../design/components/Button';
import { DetailDrawer } from '../../../design/components/DetailDrawer';
import { NlSearchBar } from '../../../design/components/NlSearchBar';
import { parcelsToCsv, downloadCsv } from '../../../lib/csv';
import type { ParcelRow } from '../../../lib/dashboard-types';

const COLUMNS: { key: string; label: string; sortField?: string }[] = [
  { key: 'trackingId', label: 'Tracking ID', sortField: 'trackingId' },
  { key: 'carrier', label: 'Carrier', sortField: 'carrier' },
  { key: 'status', label: 'Status', sortField: 'status' },
  { key: 'actualLocation', label: 'Location', sortField: 'actualLocation' },
  { key: 'recipientName', label: 'Recipient', sortField: 'recipientName' },
  { key: 'recipientDepartment', label: 'Department' },
  { key: 'sourceSystem', label: 'Source' },
  { key: 'timestampLastEvent', label: 'Last Event', sortField: 'timestampLastEvent' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function TableClient() {
  const { filters, update, clearAll, apiQueryString, activeCount } = useDashboardFilters();
  const [sortField, setSortField] = useState('timestampLastEvent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [railOpen, setRailOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { rows, total, loading, setRows, refetch } = useParcels(
    apiQueryString,
    `sortField=${sortField}&sortDir=${sortDir}`,
  );
  const meta = useDashboardMeta();
  const status = useParcelStream((event) => {
    setRows((prev) => [event.parcel, ...prev.filter((p) => p.trackingId !== event.parcel.trackingId)]);
  });

  useEffect(() => {
    const reconcile = setInterval(refetch, 30_000);
    return () => clearInterval(reconcile);
  }, [refetch]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const removableChips: { label: string; onRemove: () => void }[] = [
    ...filters.carrier.map((c) => ({ label: c, onRemove: () => update({ carrier: filters.carrier.filter((x) => x !== c) }) })),
    ...filters.status.map((s) => ({ label: s, onRemove: () => update({ status: filters.status.filter((x) => x !== s) }) })),
    ...(filters.recipient ? [{ label: `Recipient: ${filters.recipient}`, onRemove: () => update({ recipient: '' }) }] : []),
    ...(filters.department ? [{ label: filters.department, onRemove: () => update({ department: '' }) }] : []),
    ...(filters.datePreset === 'custom'
      ? [
          {
            label: `${filters.dateFrom.slice(0, 10)} → ${filters.dateTo.slice(0, 10)}`,
            onRemove: () => update({ datePreset: 'all', dateFrom: '', dateTo: '' }),
          },
        ]
      : filters.datePreset !== 'all'
        ? [{ label: filters.datePreset, onRemove: () => update({ datePreset: 'all' }) }]
        : []),
    ...(filters.locationType !== 'ALL' ? [{ label: filters.locationType, onRemove: () => update({ locationType: 'ALL' }) }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)', color: 'var(--content-primary)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `var(--space-4) var(--space-6)`,
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-raised)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)' }}>
          <span style={{ font: 'var(--text-h3)', color: 'var(--content-brand)' }}>BOSCH</span>
          <span style={{ font: 'var(--text-body)', color: 'var(--content-secondary)' }}>Parcel Status — Table</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <LiveBadge status={status} />
          <ModeSwitcher />
        </div>
      </header>

      <div style={{ display: 'flex' }}>
        <div className="hidden lg:block" style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)', padding: 'var(--space-6)' }}>
          <FilterRail
            filters={filters}
            update={update}
            clearAll={clearAll}
            activeCount={activeCount}
            carriers={meta.carriers}
            departments={meta.departments}
          />
        </div>

        <main style={{ flex: 1, padding: 'var(--space-6)', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <NlSearchBar onApply={update} />

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <input
                type="search"
                placeholder="Search tracking ID, recipient, location, department, SAP PO…"
                value={filters.search}
                onChange={(e) => update({ search: e.target.value })}
                style={{
                  flex: 1,
                  height: 'var(--target-min)',
                  padding: `0 var(--space-4)`,
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-default)',
                  background: 'var(--surface-raised)',
                  color: 'var(--content-primary)',
                  font: 'var(--text-body)',
                }}
              />
              <div className="lg:hidden">
                <Button variant="secondary" onClick={() => setRailOpen(true)}>
                  Filters{activeCount ? ` (${activeCount})` : ''}
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={() => downloadCsv('parcels.csv', parcelsToCsv(rows))}
                disabledReason={rows.length === 0 ? 'No rows to export' : undefined}
                disabled={rows.length === 0}
              >
                Export CSV
              </Button>
            </div>

            {removableChips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
                {removableChips.map((c, i) => (
                  <Chip key={i} active onRemove={c.onRemove}>
                    {c.label}
                  </Chip>
                ))}
                <Button variant="ghost" size="compact" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
            )}

            <span className="tabular" style={{ font: 'var(--text-body-sm)', color: 'var(--content-secondary)' }}>
              {loading ? 'Loading…' : `Showing ${rows.length} of ${total} parcels`}
            </span>
          </div>

          {rows.length === 0 && !loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-16)',
                color: 'var(--content-secondary)',
              }}
            >
              <span style={{ font: 'var(--text-h3)', color: 'var(--content-primary)' }}>No parcels match these filters</span>
              <Button variant="secondary" onClick={clearAll}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
              <table className="tabular" style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-body-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sunken)' }}>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        onClick={col.sortField ? () => toggleSort(col.sortField!) : undefined}
                        style={{
                          textAlign: 'left',
                          padding: 'var(--space-3) var(--space-4)',
                          font: 'var(--text-label)',
                          color: 'var(--content-secondary)',
                          cursor: col.sortField ? 'pointer' : undefined,
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        {col.label}
                        {col.sortField === sortField && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: ParcelRow) => (
                    <tr
                      key={row.trackingId}
                      onClick={() => setSelected(row.trackingId)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    >
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        {row.trackingId}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <CarrierBadge carrier={row.carrier} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <StatusPill status={row.status} />
                      </td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        {row.actualLocation ?? '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.recipientName ?? 'Unassigned'}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--content-secondary)' }}>
                        {row.recipientDepartment ?? '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--content-secondary)' }}>
                        {row.sourceSystem === 'INBOUND_APP' ? 'Inbound App' : row.sourceSystem}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                        {formatDate(row.timestampLastEvent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {railOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-sheet)', display: 'flex' }}>
          <div onClick={() => setRailOpen(false)} style={{ position: 'absolute', inset: 0, background: 'var(--surface-scrim)' }} />
          <div
            style={{
              position: 'relative',
              width: 'min(20rem, 85vw)',
              height: '100%',
              background: 'var(--surface-raised)',
              padding: 'var(--space-6)',
              overflowY: 'auto',
            }}
          >
            <FilterRail
              filters={filters}
              update={update}
              clearAll={clearAll}
              activeCount={activeCount}
              carriers={meta.carriers}
              departments={meta.departments}
            />
          </div>
        </div>
      )}

      {selected && <DetailDrawer trackingId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
