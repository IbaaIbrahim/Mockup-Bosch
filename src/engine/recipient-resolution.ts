/**
 * Recipient identification and email eligibility.
 *
 * Implements PDF §3.2.4 B.1 (recipient & department resolution) and §3.2.4 D
 * (email trigger).
 *
 * Pure: the SAP and Active Directory lookups are passed in as already-fetched
 * rows. The adapters that fetch them live in src/adapters/.
 *
 * Gates: C4, C6, C7, C13, C14
 */

import type { DirectoryUser, SapOrder } from './types';

// ─── SAP PO validation (PDF §3.2.2.1 Step 2) ────────────────────────────────

/**
 * "The operator can only submit the number by tapping 'Next', if 10 digits has
 * been entered."
 */
export const SAP_PO_LENGTH = 10;

export function isValidSapPo(input: string): boolean {
  return new RegExp(`^[0-9]{${SAP_PO_LENGTH}}$`).test(input.trim());
}

/** Powers the live "7 / 10" counter that makes the disabled button explain itself. */
export function sapPoProgress(input: string): { entered: number; required: number } {
  return {
    entered: input.replace(/\D/g, '').length,
    required: SAP_PO_LENGTH,
  };
}

// ─── Name normalisation ─────────────────────────────────────────────────────

/** The literal string the operator must enter when no name is on the package. */
export const UNKNOWN_RECIPIENT = 'Unknown';

export function isUnknownRecipient(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === UNKNOWN_RECIPIENT.toLowerCase();
}

function normaliseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Look a person up in the simulated Active Directory.
 *
 * Matches on the canonical name and on declared aliases — the source document
 * uses "Alice Wonder" in §3.1.3.3 and the tbl_parcels sample but "Alice
 * Wonderland" in the AD table (docs/08-QUESTIONS-FOR-BOSCH.md Q7), so both
 * spellings must resolve to one person.
 */
export function findDirectoryUser(
  name: string,
  directory: readonly DirectoryUser[],
): DirectoryUser | null {
  const target = normaliseName(name);
  if (!target) return null;

  for (const user of directory) {
    if (normaliseName(user.recipientName) === target) return user;
    if (user.aliases?.some((a) => normaliseName(a) === target)) return user;
  }
  return null;
}

// ─── Resolution ─────────────────────────────────────────────────────────────

export interface ResolvedRecipient {
  /** null when the operator entered "Unknown" (§3.2.4 B.1). */
  recipientName: string | null;
  /** null when unknown, or when SAP/AD returned no department. */
  department: string | null;
  /** null when no directory entry was found. Drives the email trigger. */
  email: string | null;
  /** Did we actually query the directory? Surfaced in the ops console. */
  directoryQueried: boolean;
  source: 'SAP' | 'DIRECTORY' | 'MANUAL' | 'UNKNOWN';
  trace: string;
}

/**
 * SAP path (§3.2.4 B.1): SAP supplies the recipient name and department, either
 * of which may be null. The email is still resolved through Active Directory,
 * because SAP holds no addresses.
 */
export function resolveFromSap(
  order: SapOrder,
  directory: readonly DirectoryUser[],
): ResolvedRecipient {
  const name = order.recipientName?.trim() || null;
  let department = order.department?.trim() || null;
  let email: string | null = null;
  let directoryQueried = false;

  if (name) {
    directoryQueried = true;
    const user = findDirectoryUser(name, directory);
    if (user) {
      email = user.emailAddress;
      // AD fills the gap when SAP has no department.
      if (!department) department = user.department;
    }
  }

  return {
    recipientName: name,
    department,
    email,
    directoryQueried,
    source: 'SAP',
    trace: `SAP PO ${order.sapPoNumber} → ${name ?? 'no recipient'} / ${
      department ?? 'no department'
    }${email ? ` · email ${email}` : ' · no email on file'}`,
  };
}

/**
 * Manual path (§3.2.4 B.1).
 *
 * "If the recipient's name is unknown, the system sets ${v_recipient_name} and
 * ${v_department} to NULL and no query to the Bosch_Active_Directory is needed."
 *
 * The skipped lookup is deliberate and observable — gate C7.
 */
export function resolveFromName(
  enteredName: string,
  directory: readonly DirectoryUser[],
): ResolvedRecipient {
  if (isUnknownRecipient(enteredName)) {
    return {
      recipientName: null,
      department: null,
      email: null,
      directoryQueried: false,
      source: 'UNKNOWN',
      trace:
        'Recipient entered as "Unknown" — Active Directory not queried (§3.2.4 B.1)',
    };
  }

  const user = findDirectoryUser(enteredName, directory);

  if (!user) {
    return {
      recipientName: enteredName.trim(),
      department: null,
      email: null,
      directoryQueried: true,
      source: 'MANUAL',
      trace: `"${enteredName.trim()}" not found in Active Directory — no department, no email`,
    };
  }

  return {
    recipientName: user.recipientName,
    department: user.department,
    email: user.emailAddress,
    directoryQueried: true,
    source: 'DIRECTORY',
    trace: `"${enteredName.trim()}" → ${user.ntUserId} / ${
      user.department ?? 'no department'
    } · ${user.emailAddress}`,
  };
}

// ─── Email trigger (PDF §3.2.4 D) ───────────────────────────────────────────

export interface EmailDecision {
  send: boolean;
  reason: string;
  to?: string;
  subject?: string;
  body?: string;
}

/**
 * "IF (${v_proposed_location} CONTAINS "RACK") AND (${v_recipient_email} IS NOT
 * NULL) THEN trigger an API call to the SMTP Gateway... ELSE (if location is
 * "TROLLEY" or email is NULL) skip the email dispatch."
 *
 * Both negative cases are demonstrated on stage (gate C14), so the skip reason
 * must be specific enough to narrate.
 */
export function decideEmail(params: {
  proposedLocation: string;
  actualLocation: string;
  recipientEmail: string | null;
  trackingId: string;
  carrier: string;
}): EmailDecision {
  const { proposedLocation, actualLocation, recipientEmail, trackingId, carrier } =
    params;

  const isRack = proposedLocation.toUpperCase().includes('RACK');

  if (!isRack) {
    return {
      send: false,
      reason: `No notification — ${proposedLocation} is not a rack, the parcel is in transit.`,
    };
  }

  if (!recipientEmail) {
    return {
      send: false,
      reason:
        'No notification — no email address on file for this recipient.',
    };
  }

  return {
    send: true,
    to: recipientEmail,
    // Subject and body are verbatim from PDF §3.2.4 D. Do not reword.
    subject: 'Your parcel is ready for pickup at Goods Receipt',
    body: `Your parcel with the tracking ID ${trackingId} from carrier ${carrier} has been safely stored and is ready for pickup. Pickup Location: ${actualLocation}`,
    reason: `Notification sent to ${recipientEmail}`,
  };
}
