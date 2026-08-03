'use client';

/**
 * Inbound Registration wizard orchestrator (docs/03-APP2-INBOUND.md §2 flow
 * map). Holds wizard UI state and a step history for Back; every step is
 * still a stateless API call underneath — see src/server/inbound-service.ts.
 */

import { useCallback, useEffect, useState } from 'react';
import { AppBar } from '../../design/components/AppBar';
import { ProgressStepper } from '../../design/components/ProgressStepper';
import { ScanScreen } from './screens/ScanScreen';
import { RecipientChoiceScreen } from './screens/RecipientChoiceScreen';
import { SapEntryScreen } from './screens/SapEntryScreen';
import { NameEntryScreen } from './screens/NameEntryScreen';
import { ProposalScreen } from './screens/ProposalScreen';
import { LocationScanScreen } from './screens/LocationScanScreen';
import { CompletionScreen } from './screens/CompletionScreen';
import { newSessionId, type WizardData, type WizardStep } from './wizard-types';
import { useDemoFrame } from '../../design/components/PhoneFrame';

const STORAGE_KEY = 'bosch-inbound-wizard-v1';

const STEP_SEGMENT: Record<WizardStep, number> = {
  SCAN: 1,
  RECIPIENT_CHOICE: 2,
  SAP_ENTRY: 2,
  NAME_ENTRY: 2,
  PROPOSAL: 3,
  LOCATION_SCAN: 4,
  COMPLETE: 4,
};

interface CascadeApiResult {
  result: {
    location: { locationId: string; locationType: 'RACK' | 'TROLLEY' | 'STAGING'; displayName?: string };
    priority: 1 | 2 | 3;
    reason: string;
  } | null;
  trace: WizardData['cascadeTrace'];
}

function freshData(): WizardData {
  return { sessionId: newSessionId(), startedAt: new Date().toISOString() };
}

export function InboundWizard() {
  const [step, setStep] = useState<WizardStep>('SCAN');
  const [history, setHistory] = useState<WizardStep[]>([]);
  const [data, setData] = useState<WizardData>(freshData);
  const [mismatchActive, setMismatchActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { setHardBlocked } = useDemoFrame();

  // Mirror the hard block up to the phone frame so it hides the footer Inbox
  // link. C10 (docs/09 §5) pins the mismatch screen to *no* way forward but
  // rescanning; a stray footer link is a navigation that test asserts to zero.
  useEffect(() => {
    setHardBlocked(mismatchActive);
    return () => setHardBlocked(false);
  }, [mismatchActive, setHardBlocked]);

  // Resume mid-flow after an accidental reload (docs/03-APP2-INBOUND.md §8).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { step: WizardStep; history: WizardStep[]; data: WizardData };
        setStep(saved.step);
        setHistory(saved.history);
        setData(saved.data);
      }
    } catch {
      // Corrupt or absent session state — start fresh, silently.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, history, data }));
  }, [step, history, data, hydrated]);

  const goTo = useCallback(
    (next: WizardStep) => {
      setHistory((h) => [...h, step]);
      setStep(next);
    },
    [step],
  );

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const copy = [...h];
      const prev = copy.pop()!;
      setStep(prev);
      return copy;
    });
  }, []);

  const runProposal = useCallback(async (department: string | null, sessionId: string) => {
    const res = await fetch('/api/inbound/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department, sessionId }),
    });
    const outcome: CascadeApiResult = await res.json();
    return outcome;
  }, []);

  const applyProposal = useCallback(
    (nextData: WizardData, outcome: CascadeApiResult) => {
      if (!outcome.result) return;
      setData({
        ...nextData,
        proposedLocation: outcome.result.location,
        cascadePriority: outcome.result.priority,
        cascadeReason: outcome.result.reason,
        cascadeTrace: outcome.trace,
      });
      goTo('PROPOSAL');
    },
    [goTo],
  );

  const resetWizard = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setData(freshData());
    setHistory([]);
    setStep('SCAN');
  };

  if (!hydrated) return null;

  const canGoBack = history.length > 0 && step !== 'COMPLETE' && !mismatchActive;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-page)' }}>
      <AppBar title="Inbound Registration" onBack={canGoBack ? goBack : undefined} />
      {step !== 'COMPLETE' && (
        <div style={{ padding: 'var(--space-4) 0' }}>
          <ProgressStepper current={STEP_SEGMENT[step]} total={4} />
        </div>
      )}

      <div style={{ flex: 1 }}>
        {step === 'SCAN' && (
          <ScanScreen
            onValidated={(trackingId, carrier) => {
              setData((d) => ({ ...d, trackingId, carrier }));
              goTo('RECIPIENT_CHOICE');
            }}
          />
        )}

        {step === 'RECIPIENT_CHOICE' && (
          <RecipientChoiceScreen onChoice={(hasSapPo) => goTo(hasSapPo ? 'SAP_ENTRY' : 'NAME_ENTRY')} />
        )}

        {step === 'SAP_ENTRY' && (
          <SapEntryScreen
            onResolved={async (poNumber, resolved, completedPoNumber) => {
              const nextData: WizardData = {
                ...data,
                sapPoNumber: poNumber,
                recipientName: resolved.recipientName,
                recipientDepartment: resolved.department,
                recipientEmail: resolved.email,
                sapOrderCompleted: completedPoNumber,
              };
              setData(nextData);
              const outcome = await runProposal(resolved.department, data.sessionId);
              applyProposal(nextData, outcome);
            }}
            onFallBackToManual={() => goTo('NAME_ENTRY')}
          />
        )}

        {step === 'NAME_ENTRY' && (
          <NameEntryScreen
            onResolved={async (_name, resolved) => {
              const nextData: WizardData = {
                ...data,
                sapPoNumber: null,
                recipientName: resolved.recipientName,
                recipientDepartment: resolved.department,
                recipientEmail: resolved.email,
              };
              setData(nextData);
              const outcome = await runProposal(resolved.department, data.sessionId);
              applyProposal(nextData, outcome);
            }}
          />
        )}

        {step === 'PROPOSAL' && data.proposedLocation && (
          <ProposalScreen
            recipientName={data.recipientName ?? null}
            department={data.recipientDepartment ?? null}
            location={data.proposedLocation}
            reason={data.cascadeReason}
            trace={data.cascadeTrace}
            orderCompletedPoNumber={data.sapOrderCompleted}
            onScanLocation={() => goTo('LOCATION_SCAN')}
          />
        )}

        {step === 'LOCATION_SCAN' && data.proposedLocation && (
          <LocationScanScreen
            proposedLocationId={data.proposedLocation.locationId}
            onMismatchActive={setMismatchActive}
            onVerified={async (actualLocation) => {
              setData((d) => ({ ...d, actualLocation }));
              const res = await fetch('/api/inbound/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  trackingId: data.trackingId,
                  carrier: data.carrier,
                  sapPoNumber: data.sapPoNumber ?? null,
                  recipientName: data.recipientName ?? null,
                  recipientDepartment: data.recipientDepartment ?? null,
                  recipientEmail: data.recipientEmail ?? null,
                  proposedLocation: data.proposedLocation!.locationId,
                  actualLocation,
                }),
              });
              const finalizeResult = await res.json();
              setData((d) => ({
                ...d,
                actualLocation,
                emailSent: Boolean(finalizeResult.emailDecision?.send),
                emailTo: finalizeResult.emailDecision?.to,
              }));
              goTo('COMPLETE');
            }}
          />
        )}

        {step === 'COMPLETE' && data.trackingId && data.actualLocation && (
          <CompletionScreen
            trackingId={data.trackingId}
            actualLocation={data.actualLocation}
            emailSent={Boolean(data.emailSent)}
            emailTo={data.emailTo}
            startedAt={data.startedAt}
            onRegisterNext={resetWizard}
          />
        )}
      </div>
    </div>
  );
}
