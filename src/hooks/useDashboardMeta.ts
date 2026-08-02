'use client';

import { useEffect, useState } from 'react';
import type { ParcelStatus } from '../engine/types';

export interface DashboardKpis {
  totalToday: number;
  inTransit: number;
  stored: number;
  awaitingPickupOver24h: number;
}

export interface DashboardMeta {
  carriers: string[];
  departments: string[];
  statuses: ParcelStatus[];
  kpis: DashboardKpis;
}

const EMPTY: DashboardMeta = {
  carriers: [],
  departments: [],
  statuses: ['STORED', 'IN_TRANSIT', 'DELIVERED'],
  kpis: { totalToday: 0, inTransit: 0, stored: 0, awaitingPickupOver24h: 0 },
};

/** Poll interval — KPIs and distinct values drift slowly; this just keeps them fresh across a long-running board. */
const REFRESH_MS = 30_000;

export function useDashboardMeta(refreshKey?: unknown): DashboardMeta {
  const [meta, setMeta] = useState<DashboardMeta>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/parcels/meta')
        .then((res) => res.json())
        .then((data: DashboardMeta) => {
          if (!cancelled) setMeta(data);
        })
        .catch(() => {
          /* KPI strip staying stale for one cycle is not demo-critical. */
        });
    };
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  return meta;
}
