/**
 * In-process realtime hub — the SQLite-era replacement for Postgres
 * LISTEN/NOTIFY (docs/09-SCOPE-CONFERENCE-DEMO.md §3). One Node process, one
 * EventEmitter; /api/parcels/stream subscribes and forwards to SSE clients.
 *
 * Global-guarded against Next.js dev-mode module re-evaluation, exactly like
 * src/db/client.ts — otherwise hot reload would spawn a second emitter that
 * nobody is listening to and gate C16 (sub-2s dashboard update) would flake
 * in dev only.
 */

import { EventEmitter } from 'node:events';
import type { Parcel } from '../engine/types';
import type { OpsEventRecord } from './ops-events-repo';

export type ParcelChangeKind = 'created' | 'updated';

export interface ParcelChangeEvent {
  kind: ParcelChangeKind;
  parcel: Parcel;
}

interface DemoEvents {
  parcelChange: [ParcelChangeEvent];
  opsEvent: [OpsEventRecord];
}

class DemoEventHub extends EventEmitter {
  emitParcelChange(event: ParcelChangeEvent): void {
    this.emit('parcelChange', event);
  }
  onParcelChange(listener: (event: ParcelChangeEvent) => void): () => void {
    this.on('parcelChange', listener);
    return () => this.off('parcelChange', listener);
  }

  emitOpsEvent(event: OpsEventRecord): void {
    this.emit('opsEvent', event);
  }
  onOpsEvent(listener: (event: OpsEventRecord) => void): () => void {
    this.on('opsEvent', listener);
    return () => this.off('opsEvent', listener);
  }
}

declare global {
  var __demoEventHub: DemoEventHub | undefined;
}

export const eventHub = globalThis.__demoEventHub ?? new DemoEventHub();
if (process.env.NODE_ENV !== 'production') globalThis.__demoEventHub = eventHub;
// SSE can hold many concurrent connections (board + table + mobile + phone).
eventHub.setMaxListeners(100);

export type { DemoEvents };
