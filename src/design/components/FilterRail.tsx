'use client';

/**
 * FilterRail — docs/04-APP3-DASHBOARD.md §4.1. The four required filters
 * (carrier, date, recipient, status) plus department, rendered either as a
 * 280px sidebar (table mode) or a bottom sheet (mobile mode) by the caller.
 */

import type { ParcelStatus } from '../../engine/types';
import type { ParcelFiltersState } from '../../lib/dashboard-types';
import { Chip } from './Card';
import { Button } from './Button';

const DATE_PRESETS: { key: ParcelFiltersState['datePreset']; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
];

const STATUS_OPTIONS: { key: ParcelStatus; label: string }[] = [
  { key: 'STORED', label: 'Stored' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
];

function SectionLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag
      htmlFor={htmlFor}
      style={{
        font: 'var(--text-overline)',
        letterSpacing: 'var(--tracking-overline)',
        textTransform: 'uppercase',
        color: 'var(--content-tertiary)',
      }}
    >
      {children}
    </Tag>
  );
}

export function FilterRail({
  filters,
  update,
  clearAll,
  activeCount,
  carriers,
  departments,
}: {
  filters: ParcelFiltersState;
  update: (patch: Partial<ParcelFiltersState>) => void;
  clearAll: () => void;
  activeCount: number;
  carriers: string[];
  departments: string[];
}) {
  const toggleCarrier = (c: string) => {
    update({ carrier: filters.carrier.includes(c) ? filters.carrier.filter((x) => x !== c) : [...filters.carrier, c] });
  };
  const toggleStatus = (s: ParcelStatus) => {
    update({ status: filters.status.includes(s) ? filters.status.filter((x) => x !== s) : [...filters.status, s] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: 'var(--text-h3)', color: 'var(--content-primary)' }}>Filters</span>
        {activeCount > 0 && (
          <Button variant="ghost" size="compact" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Carrier</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {carriers.map((c) => (
            <Chip key={c} active={filters.carrier.includes(c)} onClick={() => toggleCarrier(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Status</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {STATUS_OPTIONS.map((s) => (
            <Chip key={s.key} active={filters.status.includes(s.key)} onClick={() => toggleStatus(s.key)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Date</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {DATE_PRESETS.map((d) => (
            <Chip
              key={d.key}
              active={filters.datePreset === d.key}
              onClick={() => update({ datePreset: filters.datePreset === d.key ? 'all' : d.key })}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel htmlFor="filter-recipient">Recipient</SectionLabel>
        <input
          id="filter-recipient"
          type="text"
          placeholder="Name, or 'Unassigned'"
          value={filters.recipient}
          onChange={(e) => update({ recipient: e.target.value })}
          style={{
            height: 'var(--target-compact)',
            padding: `0 var(--space-3)`,
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-default)',
            background: 'var(--surface-raised)',
            color: 'var(--content-primary)',
            font: 'var(--text-body-sm)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Department</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {departments.map((d) => (
            <Chip
              key={d}
              active={filters.department === d}
              onClick={() => update({ department: filters.department === d ? '' : d })}
            >
              {d}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Location type</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {(['RACK', 'TROLLEY', 'STAGING'] as const).map((lt) => (
            <Chip
              key={lt}
              active={filters.locationType === lt}
              onClick={() => update({ locationType: filters.locationType === lt ? 'ALL' : lt })}
            >
              {lt}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
