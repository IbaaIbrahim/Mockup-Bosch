/**
 * Carrier label patterns — stored as data (docs/03-APP2-INBOUND.md §3.2),
 * so an unsupported carrier appearing on stage is an admin action, not a
 * deploy (gate C3 / risk R3).
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { carrierFormats } from '../db/schema';
import type { CarrierFormat } from '../engine/carrier-format';
import { validateNewPattern } from '../engine/carrier-format';

function toCarrierFormat(row: typeof carrierFormats.$inferSelect): CarrierFormat {
  return {
    carrier: row.carrier,
    pattern: row.pattern,
    priority: row.priority,
    isActive: row.isActive,
  };
}

export function getAllCarrierFormats(): CarrierFormat[] {
  return db.select().from(carrierFormats).all().map(toCarrierFormat);
}

export function getActiveCarrierFormats(): CarrierFormat[] {
  return getAllCarrierFormats().filter((f) => f.isActive);
}

export type AddCarrierPatternResult =
  | { ok: true; format: CarrierFormat }
  | { ok: false; reason: string };

/**
 * Admin "add pattern" action. Re-runs the engine's guard against the current
 * live data (not just DEFAULT_CARRIER_FORMATS) so a pattern added minutes ago
 * on stage is also considered when a second one is added.
 */
export function addCarrierPattern(params: {
  carrier: string;
  pattern: string;
  priority?: number;
}): AddCarrierPatternResult {
  const existing = getAllCarrierFormats();
  const check = validateNewPattern(params.pattern, existing);
  if (!check.ok) return { ok: false, reason: check.reason };

  // New patterns default to a low priority (100+) so they can never shadow a
  // specified one added earlier — docs/03-APP2-INBOUND.md §3.2.
  const priority = params.priority ?? 100 + existing.length;

  db.insert(carrierFormats)
    .values({ carrier: params.carrier, pattern: params.pattern, priority, isActive: true })
    .onConflictDoUpdate({
      target: carrierFormats.carrier,
      set: { pattern: params.pattern, priority, isActive: true },
    })
    .run();

  return { ok: true, format: { carrier: params.carrier, pattern: params.pattern, priority, isActive: true } };
}

export function setCarrierPatternActive(carrier: string, isActive: boolean): void {
  db.update(carrierFormats).set({ isActive }).where(eq(carrierFormats.carrier, carrier)).run();
}
