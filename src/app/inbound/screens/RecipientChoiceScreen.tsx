'use client';

/**
 * "Does an active SAP PO number exist?" — one of only two screens with
 * equally weighted actions (docs/01-DESIGN-SYSTEM.md §1 principle 1): the
 * system genuinely has no preferred answer here.
 */

import { Button } from '../../../design/components/Button';

export function RecipientChoiceScreen({ onChoice }: { onChoice: (hasSapPo: boolean) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 'var(--space-8)',
        padding: 'var(--space-8)',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <h2 style={{ font: 'var(--text-h1)', margin: 0 }}>Does an active SAP PO number exist?</h2>
      <div style={{ display: 'flex', gap: 'var(--space-4)', width: '100%', maxWidth: '28rem' }}>
        <Button variant="secondary" size="primary" fullWidth onClick={() => onChoice(false)}>
          No
        </Button>
        <Button variant="primary" size="primary" fullWidth onClick={() => onChoice(true)}>
          Yes
        </Button>
      </div>
    </div>
  );
}
