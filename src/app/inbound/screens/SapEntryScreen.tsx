'use client';

/**
 * Step 2, Path A — SAP PO entry (docs/03-APP2-INBOUND.md §4.2). Gate C4:
 * Next stays disabled until exactly 10 digits, with a live counter so the
 * disabled state explains itself.
 */

import { useState } from 'react';
import { Field } from '../../../design/components/Field';
import { Button } from '../../../design/components/Button';

const SAP_PO_LENGTH = 10;

interface ResolvedRecipient {
  recipientName: string | null;
  department: string | null;
  email: string | null;
}

interface SapLookupResponse {
  found: boolean;
  message?: string;
  order?: { sapPoNumber: string; recipientName: string | null; department: string | null; orderStatus: 'ACTIVE' | 'COMPLETED' };
  resolved?: ResolvedRecipient;
}

export function SapEntryScreen({
  onResolved,
  onFallBackToManual,
}: {
  /**
   * completedPoNumber is set when order_status === 'COMPLETED' (PDF §4.2:
   * "Accept but show an informational chip"). It's threaded through to the
   * Proposal screen rather than shown here — this screen navigates away as
   * soon as onResolved() runs, so a chip rendered here would flash and
   * vanish before the operator could read it.
   */
  onResolved: (poNumber: string, resolved: ResolvedRecipient, completedPoNumber?: string) => void;
  onFallBackToManual: () => void;
}) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const digitsOnly = value.replace(/\D/g, '');
  const isComplete = digitsOnly.length === SAP_PO_LENGTH;

  const submit = async () => {
    if (!isComplete) return;
    setPending(true);
    setNotFound(false);
    try {
      const res = await fetch('/api/inbound/sap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poNumber: digitsOnly }),
      });
      const data: SapLookupResponse = await res.json();
      if (!data.found || !data.resolved) {
        setNotFound(true);
        return;
      }
      const completedPoNumber = data.order?.orderStatus === 'COMPLETED' ? data.order.sapPoNumber : undefined;
      onResolved(digitsOnly, data.resolved, completedPoNumber);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-5)' }}>
      <h2 style={{ font: 'var(--text-h2)', margin: 0, textAlign: 'center' }}>Enter the SAP PO number</h2>

      <Field
        label="SAP PO number"
        inputMode="numeric"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, SAP_PO_LENGTH))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        counter={{ entered: digitsOnly.length, required: SAP_PO_LENGTH }}
        errorText={notFound ? 'PO number not found in SAP.' : undefined}
      />

      {notFound ? (
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" fullWidth onClick={() => setNotFound(false)}>
            Try again
          </Button>
          <Button variant="primary" fullWidth onClick={onFallBackToManual}>
            Continue without PO
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          size="primary"
          fullWidth
          disabled={!isComplete}
          disabledReason={`Enter all ${SAP_PO_LENGTH} digits to continue (${digitsOnly.length} / ${SAP_PO_LENGTH})`}
          loading={pending}
          onClick={submit}
        >
          Next
        </Button>
      )}
    </div>
  );
}
