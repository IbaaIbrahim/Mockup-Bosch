'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ParcelRow } from '../lib/dashboard-types';

export interface UseParcelsResult {
  rows: ParcelRow[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setRows: React.Dispatch<React.SetStateAction<ParcelRow[]>>;
}

export function useParcels(queryString: string, sort?: string): UseParcelsResult {
  const [rows, setRows] = useState<ParcelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fullQuery = sort ? `${queryString}${queryString ? '&' : ''}${sort}` : queryString;

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/parcels?${fullQuery}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: { rows: ParcelRow[]; total: number }) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fullQuery, tick]);

  return { rows, total, loading, error, refetch, setRows };
}
