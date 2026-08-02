/**
 * Orchestrates the inbound registration wizard: every business decision goes
 * through src/engine/**, this file only wires engine + adapters + repos
 * together and writes the observable trail (CLAUDE.md rules 1, 2, 4).
 */

import { rawDb } from '../db/client';
import {
  INVALID_FORMAT_MESSAGE,
  matchCarrier,
  successMessage,
  type CarrierMatch,
} from '../engine/carrier-format';
import { proposeLocation, shouldMarkOccupied, type CascadeOutcome } from '../engine/location-cascade';
import { verifyLocation, type VerificationResult } from '../engine/location-verify';
import {
  SAP_PO_LENGTH,
  decideEmail,
  isUnknownRecipient,
  isValidSapPo,
  resolveFromName,
  resolveFromSap,
  type EmailDecision,
  type ResolvedRecipient,
} from '../engine/recipient-resolution';
import type { Parcel, ParcelStatus, SapOrder } from '../engine/types';
import { sapAdapter } from '../adapters/sap';
import { directoryAdapter } from '../adapters/directory';
import { smtpAdapter } from '../adapters/smtp';
import { getActiveCarrierFormats } from './carrier-formats-repo';
import {
  getAllLocationIds,
  getLocation,
  getLocationsForCascade,
  markOccupied,
  releaseReservation,
  reserveLocation,
} from './locations-repo';
import {
  getParcelByTrackingId,
  insertParcel,
  insertParcelEvent,
} from './parcels-repo';
import { logOpsEvent } from './ops-events-repo';
import { eventHub } from './events-hub';

// ─── Step 1 — scan & validate ────────────────────────────────────────────────

export interface ScanValidationResult {
  valid: boolean;
  raw: string;
  message: string;
  trackingId?: string;
  carrier?: string;
  normalised?: string;
  /** Set when this tracking ID is already STORED — amber duplicate wash, not red/green. */
  duplicate?: { status: ParcelStatus; timestampLastEvent: string; actualLocation: string | null };
}

export function validateTrackingScan(raw: string): ScanValidationResult {
  const formats = getActiveCarrierFormats();
  const match: CarrierMatch = matchCarrier(raw, formats);

  if (!match.valid) {
    logOpsEvent({
      kind: 'SCAN_VALIDATED',
      decision: 'REJECTED',
      reason: match.reason,
      payload: { raw: match.raw, normalised: match.normalised },
    });
    return { valid: false, raw: match.raw, normalised: match.normalised, message: INVALID_FORMAT_MESSAGE };
  }

  const existing = getParcelByTrackingId(match.trackingId);
  if (existing && existing.status === 'STORED') {
    logOpsEvent({
      kind: 'SCAN_VALIDATED',
      decision: 'OK',
      reason: `Duplicate scan of already-stored ${match.trackingId}`,
      trackingId: match.trackingId,
    });
    return {
      valid: true,
      raw,
      trackingId: match.trackingId,
      carrier: match.carrier,
      message: successMessage(match.trackingId, match.carrier),
      duplicate: {
        status: existing.status,
        timestampLastEvent: existing.timestampLastEvent,
        actualLocation: existing.actualLocation,
      },
    };
  }

  logOpsEvent({
    kind: 'SCAN_VALIDATED',
    decision: 'OK',
    reason: `${match.carrier} label recognised`,
    trackingId: match.trackingId,
  });

  return {
    valid: true,
    raw,
    trackingId: match.trackingId,
    carrier: match.carrier,
    message: successMessage(match.trackingId, match.carrier),
  };
}

// ─── Step 2a — SAP PO path ───────────────────────────────────────────────────

export interface SapLookupResult {
  found: boolean;
  message?: string;
  order?: SapOrder;
  resolved?: ResolvedRecipient;
}

export async function lookupSapOrder(poNumber: string): Promise<SapLookupResult> {
  if (!isValidSapPo(poNumber)) {
    return { found: false, message: `SAP PO number must be exactly ${SAP_PO_LENGTH} digits.` };
  }

  const order = await sapAdapter.lookupPurchaseOrder(poNumber);
  if (!order) {
    logOpsEvent({
      kind: 'SAP_LOOKUP',
      decision: 'NOT_FOUND',
      reason: `PO ${poNumber} not found in SAP_ERP`,
    });
    return { found: false, message: 'PO number not found in SAP.' };
  }

  const directory = await directoryAdapter.all();
  const resolved = resolveFromSap(order, directory);

  logOpsEvent({ kind: 'SAP_LOOKUP', decision: 'OK', reason: resolved.trace });

  return { found: true, order, resolved };
}

// ─── Step 2b — manual name path ──────────────────────────────────────────────

export async function searchDirectoryNames(query: string) {
  return directoryAdapter.search(query);
}

/**
 * "Unknown" is a hard skip: the Active Directory is never queried for it
 * (PDF §3.2.4 B.1, gate C7). That guarantee is enforced by checking BEFORE
 * fetching the directory at all — resolveFromName() would also return the
 * right shape either way, but only skipping the fetch makes the "no query
 * happened" claim literally true, not just logically true.
 */
export async function resolveManualRecipient(enteredName: string): Promise<ResolvedRecipient> {
  if (isUnknownRecipient(enteredName)) {
    const resolved = resolveFromName(enteredName, []);
    logOpsEvent({ kind: 'RECIPIENT_RESOLVED', decision: 'SKIPPED', reason: resolved.trace });
    return resolved;
  }

  const directory = await directoryAdapter.all();
  const resolved = resolveFromName(enteredName, directory);
  logOpsEvent({
    kind: 'RECIPIENT_RESOLVED',
    decision: resolved.source === 'DIRECTORY' ? 'OK' : 'NOT_FOUND',
    reason: resolved.trace,
  });
  return resolved;
}

// ─── Step 2c — location proposal (§3.2.4 B.2) ────────────────────────────────

export function proposeStorageLocation(department: string | null, sessionId: string): CascadeOutcome {
  const locations = getLocationsForCascade(sessionId);
  const outcome = proposeLocation(department, locations);

  if (outcome.result) {
    reserveLocation(outcome.result.location.locationId, sessionId);
    logOpsEvent({
      kind: 'LOCATION_PROPOSED',
      decision: 'OK',
      reason: outcome.result.reason,
      payload: { locationId: outcome.result.location.locationId, priority: outcome.result.priority },
    });
  } else {
    logOpsEvent({
      kind: 'LOCATION_PROPOSED',
      decision: 'REJECTED',
      reason: 'Cascade exhausted — no storage location configured',
    });
  }

  return outcome;
}

// ─── Step 3 — location verification (§3.2.4 C) ───────────────────────────────

export function verifyLocationScan(proposedLocationId: string, rawScan: string): VerificationResult {
  const knownIds = getAllLocationIds();
  const result = verifyLocation(proposedLocationId, rawScan, knownIds);

  const decision = result.status === 'MATCH' ? 'OK' : result.status === 'MISMATCH' ? 'BLOCKED' : 'REJECTED';
  logOpsEvent({
    kind: 'LOCATION_VERIFIED',
    decision,
    reason: result.message,
    payload: { scanned: result.scanned, expected: result.expected, status: result.status },
  });

  return result;
}

// ─── Step 4 — finalisation (§3.2.4 D) ────────────────────────────────────────

export interface FinalizeParams {
  trackingId: string;
  carrier: string;
  sapPoNumber: string | null;
  recipientName: string | null;
  recipientDepartment: string | null;
  recipientEmail: string | null;
  proposedLocation: string;
  actualLocation: string;
}

export interface FinalizeResult {
  parcel: Parcel;
  emailDecision: EmailDecision;
}

export async function finalizeRegistration(params: FinalizeParams): Promise<FinalizeResult> {
  const now = new Date().toISOString();
  const parcel: Parcel = {
    trackingId: params.trackingId,
    carrier: params.carrier,
    sapPoNumber: params.sapPoNumber,
    recipientName: params.recipientName,
    recipientDepartment: params.recipientDepartment,
    recipientEmail: params.recipientEmail,
    proposedLocation: params.proposedLocation,
    actualLocation: params.actualLocation,
    status: 'STORED',
    sourceSystem: 'INBOUND_APP',
    timestampLastEvent: now,
    createdAt: now,
  };

  const location = getLocation(params.actualLocation);
  const markOccupiedFlag = location ? shouldMarkOccupied(location) : false;

  // Single atomic unit: insert parcel, occupy the rack (racks only — see
  // shouldMarkOccupied / deviation D9), log the event, release the soft
  // reservation. better-sqlite3 is one synchronous connection, so wrapping
  // the repo calls (which all use that same connection under the hood) in
  // its native transaction() is both correct and simpler than threading a tx
  // handle through every repo function.
  const runFinalizeTransaction = rawDb.transaction(() => {
    insertParcel(parcel);
    if (markOccupiedFlag) markOccupied(params.actualLocation);
    insertParcelEvent({
      trackingId: parcel.trackingId,
      kind: 'STORED',
      payload: { location: params.actualLocation },
      actor: 'inbound-app',
    });
    releaseReservation(params.proposedLocation);
  });
  runFinalizeTransaction();

  eventHub.emitParcelChange({ kind: 'created', parcel });

  const emailDecision = decideEmail({
    proposedLocation: params.proposedLocation,
    actualLocation: params.actualLocation,
    recipientEmail: params.recipientEmail,
    trackingId: params.trackingId,
    carrier: params.carrier,
  });

  if (emailDecision.send) {
    await smtpAdapter.send({
      to: emailDecision.to!,
      subject: emailDecision.subject!,
      body: emailDecision.body!,
      context: { trackingId: params.trackingId },
    });
    insertParcelEvent({
      trackingId: parcel.trackingId,
      kind: 'EMAIL_SENT',
      payload: { to: emailDecision.to },
      actor: 'smtp-adapter',
    });
  } else {
    insertParcelEvent({
      trackingId: parcel.trackingId,
      kind: 'EMAIL_SKIPPED',
      payload: { reason: emailDecision.reason },
      actor: 'system',
    });
  }

  logOpsEvent({
    kind: 'FINALIZED',
    decision: 'OK',
    reason: `Stored at ${params.actualLocation}`,
    trackingId: params.trackingId,
  });
  logOpsEvent({
    kind: 'EMAIL_DECISION',
    decision: emailDecision.send ? 'OK' : 'SKIPPED',
    reason: emailDecision.reason,
    trackingId: params.trackingId,
  });

  return { parcel, emailDecision };
}
