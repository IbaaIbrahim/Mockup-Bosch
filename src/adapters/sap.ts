/**
 * System A — SAP_ERP adapter (PDF §3.2.3.2).
 *
 * Real interface, mock implementation reading `mock_sap_orders`. CLAUDE.md
 * rule 3: "so 'how would this connect to our SAP?' has a one-sentence
 * answer" — implement SapAdapter against the real SAP endpoint, swap the
 * factory, done. Nothing above this file needs to change.
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { mockSapOrders } from '../db/schema';
import type { SapOrder } from '../engine/types';
import { adapterLatency } from './latency';

export interface SapAdapter {
  /** Returns null when the PO number has no matching order — a normal outcome, not an error. */
  lookupPurchaseOrder(poNumber: string): Promise<SapOrder | null>;
}

function toSapOrder(row: typeof mockSapOrders.$inferSelect): SapOrder {
  return {
    sapPoNumber: row.sapPoNumber,
    recipientName: row.recipientName,
    department: row.department,
    orderStatus: row.orderStatus as SapOrder['orderStatus'],
  };
}

export function createMockSapAdapter(): SapAdapter {
  return {
    async lookupPurchaseOrder(poNumber: string): Promise<SapOrder | null> {
      await adapterLatency();
      const row = db
        .select()
        .from(mockSapOrders)
        .where(eq(mockSapOrders.sapPoNumber, poNumber))
        .get();
      return row ? toSapOrder(row) : null;
    },
  };
}

export const sapAdapter: SapAdapter = createMockSapAdapter();
