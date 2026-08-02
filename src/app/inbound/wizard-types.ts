/**
 * Client-side wizard state for the inbound registration flow
 * (docs/03-APP2-INBOUND.md §2 flow map). Held in React state rather than a
 * server-side session — every step is still a stateless API call
 * (validate/sap/directory/propose/verify/finalize), so this is purely UI
 * bookkeeping, persisted to sessionStorage so an accidental reload mid-flow
 * doesn't lose the operator's progress.
 */

export type WizardStep =
  | 'SCAN'
  | 'RECIPIENT_CHOICE'
  | 'SAP_ENTRY'
  | 'NAME_ENTRY'
  | 'PROPOSAL'
  | 'LOCATION_SCAN'
  | 'COMPLETE';

export interface CascadeTraceStep {
  priority: 1 | 2 | 3;
  label: string;
  considered: number;
  hit: string | null;
  note: string;
}

export interface ProposedLocation {
  locationId: string;
  locationType: 'RACK' | 'TROLLEY' | 'STAGING';
  displayName?: string;
}

export interface WizardData {
  sessionId: string;
  startedAt: string;

  trackingId?: string;
  carrier?: string;

  recipientName?: string | null;
  recipientDepartment?: string | null;
  recipientEmail?: string | null;
  sapPoNumber?: string | null;
  /** Set when the SAP order's status was COMPLETED (PDF §4.2) — shown as an informational chip on the proposal screen. */
  sapOrderCompleted?: string;

  proposedLocation?: ProposedLocation;
  cascadePriority?: 1 | 2 | 3;
  cascadeReason?: string;
  cascadeTrace?: CascadeTraceStep[];

  actualLocation?: string;

  emailSent?: boolean;
  emailTo?: string;
}

export function newSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
