'use client';

/**
 * SSE client — docs/04-APP3-DASHBOARD.md §6. Exponential backoff, silent
 * recovery, honest connection status (the `● LIVE` badge is bound to this,
 * not decorative).
 */

import { useEffect, useRef, useState } from 'react';
import type { ParcelRow } from '../lib/dashboard-types';

export type StreamStatus = 'connecting' | 'live' | 'reconnecting';

export interface ParcelChangeEvent {
  kind: 'created' | 'updated';
  parcel: ParcelRow;
}

export function useParcelStream(onChange: (event: ParcelChangeEvent) => void): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let attempt = 0;

    function connect() {
      es = new EventSource('/api/parcels/stream');

      es.addEventListener('connected', () => {
        attempt = 0;
        setStatus('live');
      });

      es.addEventListener('parcel', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as ParcelChangeEvent;
          onChangeRef.current(data);
        } catch {
          // Malformed event — ignore rather than crash the board mid-demo.
        }
      });

      es.onerror = () => {
        if (cancelled) return;
        setStatus('reconnecting');
        es?.close();
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 15_000);
        retryTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return status;
}
