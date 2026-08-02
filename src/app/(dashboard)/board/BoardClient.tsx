'use client';

/**
 * Board mode — the wall display / projector view (docs/04-APP3-DASHBOARD.md
 * §3.1). Dark, no chrome, legible from four metres. A newly arriving parcel
 * slides in with a decaying highlight — the moment that lands during the
 * demo handoff when a phone registration appears here within 2 seconds
 * (gate C16).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParcels } from '../../../hooks/useParcels';
import { useParcelStream } from '../../../hooks/useParcelStream';
import { useDashboardMeta } from '../../../hooks/useDashboardMeta';
import { KpiTile } from '../../../design/components/KpiTile';
import { ParcelCard } from '../../../design/components/ParcelCard';
import { LiveBadge } from '../../../design/components/LiveBadge';
import { ModeSwitcher } from '../../../design/components/ModeSwitcher';
import { EmptyState } from '../../../design/components/Card';
import type { ParcelRow } from '../../../lib/dashboard-types';

const RECONCILE_MS = 30_000;
const HIGHLIGHT_MS = 1200;

export function BoardClient() {
  const { rows, setRows, refetch } = useParcels('sortField=timestampLastEvent&sortDir=desc&limit=60');
  const meta = useDashboardMeta();
  const [now, setNow] = useState(() => new Date());
  const [arrivedIds, setArrivedIds] = useState<Set<string>>(new Set());
  const arrivedTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const status = useParcelStream((event) => {
    setRows((prev) => {
      const withoutIt = prev.filter((p) => p.trackingId !== event.parcel.trackingId);
      return [event.parcel, ...withoutIt].slice(0, 60);
    });

    setArrivedIds((prev) => new Set(prev).add(event.parcel.trackingId));
    const existingTimer = arrivedTimers.current.get(event.parcel.trackingId);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      setArrivedIds((prev) => {
        const next = new Set(prev);
        next.delete(event.parcel.trackingId);
        return next;
      });
      arrivedTimers.current.delete(event.parcel.trackingId);
    }, HIGHLIGHT_MS);
    arrivedTimers.current.set(event.parcel.trackingId, timer);
  });

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    const reconcile = setInterval(refetch, RECONCILE_MS);
    return () => {
      clearInterval(clock);
      clearInterval(reconcile);
    };
  }, [refetch]);

  useEffect(() => {
    const timers = arrivedTimers.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const dateLabel = useMemo(
    () =>
      now.toLocaleString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
      }),
    [now],
  );

  return (
    <div
      data-theme="dark"
      style={{
        minHeight: '100vh',
        background: 'var(--surface-page)',
        color: 'var(--content-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `var(--space-5) var(--space-8)`,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)' }}>
          <span style={{ font: 'var(--text-h2)', color: 'var(--content-brand)', letterSpacing: 'var(--tracking-heading)' }}>
            BOSCH
          </span>
          <span style={{ font: 'var(--text-h3)', color: 'var(--content-secondary)' }}>Parcel Status</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <span className="tabular" style={{ font: 'var(--text-body)', color: 'var(--content-secondary)' }}>
            {dateLabel}
          </span>
          <LiveBadge status={status} />
          <ModeSwitcher subtle />
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <KpiTile label="Total today" value={meta.kpis.totalToday} />
        <KpiTile label="In transit" value={meta.kpis.inTransit} />
        <KpiTile label="Stored" value={meta.kpis.stored} />
        <KpiTile label="Awaiting pickup >24h" value={meta.kpis.awaitingPickupOver24h} tone="alert" />
      </section>

      <section style={{ flex: 1, padding: 'var(--space-6) var(--space-8)', overflow: 'auto' }}>
        {rows.length === 0 ? (
          <EmptyState title="No parcels yet" description="Registered and in-transit parcels will appear here in real time." />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            {rows.map((parcel: ParcelRow) => (
              <ParcelCard key={parcel.trackingId} parcel={parcel} justArrived={arrivedIds.has(parcel.trackingId)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
