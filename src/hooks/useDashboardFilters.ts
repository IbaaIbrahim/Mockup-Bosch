'use client';

/**
 * Filter state lives entirely in the URL (docs/04-APP3-DASHBOARD.md §4.2):
 * "a filtered view is shareable and, importantly, re-openable mid-demo
 * without re-clicking." Reading straight from useSearchParams() means there
 * is no separate client state to keep in sync — the URL IS the state.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ParcelStatus } from '../engine/types';
import { EMPTY_FILTERS, type ParcelFiltersState } from '../lib/dashboard-types';
import { resolveDatePreset } from '../lib/timezone';

function parseList(v: string | null): string[] {
  return v ? v.split(',').filter(Boolean) : [];
}

export function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters: ParcelFiltersState = useMemo(
    () => ({
      carrier: parseList(params.get('carrier')),
      status: parseList(params.get('status')) as ParcelStatus[],
      recipient: params.get('recipient') ?? '',
      department: params.get('department') ?? '',
      datePreset: (params.get('date') as ParcelFiltersState['datePreset']) ?? 'all',
      dateFrom: params.get('dateFrom') ?? '',
      dateTo: params.get('dateTo') ?? '',
      locationType: (params.get('locationType') as ParcelFiltersState['locationType']) ?? 'ALL',
      search: params.get('q') ?? '',
    }),
    [params],
  );

  const update = useCallback(
    (patch: Partial<ParcelFiltersState>) => {
      const next = new URLSearchParams(params.toString());
      const merged = { ...filters, ...patch };

      const set = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
      set('carrier', merged.carrier.join(','));
      set('status', merged.status.join(','));
      set('recipient', merged.recipient);
      set('department', merged.department);
      set('date', merged.datePreset === 'all' ? '' : merged.datePreset);
      set('dateFrom', merged.datePreset === 'custom' ? merged.dateFrom : '');
      set('dateTo', merged.datePreset === 'custom' ? merged.dateTo : '');
      set('locationType', merged.locationType === 'ALL' ? '' : merged.locationType);
      set('q', merged.search);

      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [filters, params, pathname, router],
  );

  const clearAll = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const apiQueryString = useMemo(() => {
    const qp = new URLSearchParams();
    if (filters.carrier.length) qp.set('carrier', filters.carrier.join(','));
    if (filters.status.length) qp.set('status', filters.status.join(','));
    if (filters.recipient) qp.set('recipient', filters.recipient);
    if (filters.department) qp.set('department', filters.department);
    if (filters.locationType !== 'ALL') qp.set('locationType', filters.locationType);
    if (filters.search) qp.set('search', filters.search);
    if (filters.datePreset === 'custom') {
      if (filters.dateFrom) qp.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) qp.set('dateTo', filters.dateTo);
    } else if (filters.datePreset !== 'all') {
      const { dateFrom, dateTo } = resolveDatePreset(filters.datePreset);
      qp.set('dateFrom', dateFrom);
      qp.set('dateTo', dateTo);
    }
    return qp.toString();
  }, [filters]);

  const activeCount =
    filters.carrier.length +
    filters.status.length +
    (filters.recipient ? 1 : 0) +
    (filters.department ? 1 : 0) +
    (filters.datePreset !== 'all' ? 1 : 0) +
    (filters.locationType !== 'ALL' ? 1 : 0) +
    (filters.search ? 1 : 0);

  return { filters: filters ?? EMPTY_FILTERS, update, clearAll, apiQueryString, activeCount };
}
