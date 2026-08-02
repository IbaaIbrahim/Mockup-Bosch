'use client';

/**
 * Ops console (docs/09-SCOPE-CONFERENCE-DEMO.md §4.3, step 21). Event feed
 * showing every decision — including skips with their reasons (CLAUDE.md
 * rule 4) — a health strip, admin for carrier patterns and storage
 * locations, and demo:reset.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppBar } from '../../design/components/AppBar';
import { KpiTile } from '../../design/components/KpiTile';
import { Button } from '../../design/components/Button';
import { Field } from '../../design/components/Field';
import { Chip } from '../../design/components/Card';

interface OpsEvent {
  eventPk: number;
  kind: string;
  trackingId: string | null;
  decision: 'OK' | 'REJECTED' | 'SKIPPED' | 'BLOCKED' | 'NOT_FOUND';
  reason: string;
  createdAt: string;
}

interface Health {
  counts: { parcels: number; storageLocations: number; emails: number; opsEvents: number };
  adapters: { latencyMs: number };
  realtime: { parcelStreamListeners: number; opsStreamListeners: number };
  uptimeSeconds: number;
}

interface CarrierFormat {
  carrier: string;
  pattern: string;
  priority: number;
  isActive: boolean;
}

interface StorageLocation {
  locationId: string;
  locationType: 'RACK' | 'TROLLEY' | 'STAGING';
  assignedDepartment: string | null;
  isOccupied: boolean;
  displayName?: string;
}

const DECISION_COLOR: Record<OpsEvent['decision'], string> = {
  OK: 'var(--status-success-fg)',
  SKIPPED: 'var(--status-warning-fg)',
  REJECTED: 'var(--status-error-fg)',
  BLOCKED: 'var(--status-error-fg)',
  NOT_FOUND: 'var(--content-tertiary)',
};

export function OpsConsoleClient() {
  const router = useRouter();
  const [events, setEvents] = useState<OpsEvent[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [formats, setFormats] = useState<CarrierFormat[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [newCarrier, setNewCarrier] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [patternError, setPatternError] = useState<string | null>(null);
  const [newLocationId, setNewLocationId] = useState('');
  const [newLocationType, setNewLocationType] = useState<'RACK' | 'TROLLEY' | 'STAGING'>('RACK');
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const loadAll = () => {
    fetch('/api/ops/events').then((r) => r.json()).then((d) => setEvents(d.events));
    fetch('/api/ops/health').then((r) => r.json()).then(setHealth);
    fetch('/api/admin/carrier-formats').then((r) => r.json()).then((d) => setFormats(d.formats));
    fetch('/api/admin/locations').then((r) => r.json()).then((d) => setLocations(d.locations));
  };

  useEffect(() => {
    loadAll();
    const healthInterval = setInterval(() => {
      fetch('/api/ops/health').then((r) => r.json()).then(setHealth);
    }, 10_000);

    const es = new EventSource('/api/ops/events/stream');
    es.addEventListener('opsEvent', (e: MessageEvent) => {
      const event: OpsEvent = JSON.parse(e.data);
      setEvents((prev) => [event, ...prev].slice(0, 300));
    });

    return () => {
      clearInterval(healthInterval);
      es.close();
    };
  }, []);

  const addCarrierPattern = async () => {
    setPatternError(null);
    const res = await fetch('/api/admin/carrier-formats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carrier: newCarrier, pattern: newPattern }),
    });
    const data = await res.json();
    if (!data.ok) {
      setPatternError(data.reason);
      return;
    }
    setNewCarrier('');
    setNewPattern('');
    fetch('/api/admin/carrier-formats').then((r) => r.json()).then((d) => setFormats(d.formats));
  };

  const addLocation = async () => {
    if (!newLocationId.trim()) return;
    await fetch('/api/admin/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: newLocationId.trim().toUpperCase(), locationType: newLocationType }),
    });
    setNewLocationId('');
    fetch('/api/admin/locations').then((r) => r.json()).then((d) => setLocations(d.locations));
  };

  const doReset = async () => {
    setResetting(true);
    try {
      await fetch('/api/admin/reset', { method: 'POST' });
      loadAll();
    } finally {
      setResetting(false);
      setResetConfirm(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      <AppBar
        title="Ops Console"
        onBack={() => router.push('/')}
        action={
          resetConfirm ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="ghost" size="compact" onClick={() => setResetConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="compact" loading={resetting} onClick={doReset}>
                Confirm reset
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="compact" onClick={() => setResetConfirm(true)}>
              Reset demo data
            </Button>
          )
        }
      />

      {health && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
          }}
        >
          <KpiTile label="Parcels" value={health.counts.parcels} />
          <KpiTile label="Locations" value={health.counts.storageLocations} />
          <KpiTile label="Emails sent" value={health.counts.emails} />
          <KpiTile label="Ops events" value={health.counts.opsEvents} />
          <KpiTile label="Adapter latency" value={`${health.adapters.latencyMs}ms`} />
          <KpiTile label="Live board viewers" value={health.realtime.parcelStreamListeners} />
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-6)', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 0 }}>
          <span style={{ font: 'var(--text-h3)' }}>Event feed</span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
              maxHeight: '75vh',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-raised)',
            }}
          >
            {events.length === 0 && (
              <div style={{ padding: 'var(--space-6)', color: 'var(--content-secondary)', textAlign: 'center' }}>
                No events yet.
              </div>
            )}
            {events.map((e) => (
              <div
                key={e.eventPk}
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  alignItems: 'baseline',
                }}
              >
                <span
                  className="mono"
                  style={{ font: 'var(--text-caption)', color: DECISION_COLOR[e.decision], minWidth: '5.5rem' }}
                >
                  {e.decision}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--text-body-sm)' }}>
                    <span className="mono" style={{ color: 'var(--content-tertiary)' }}>
                      {e.kind}
                    </span>
                    {e.trackingId && <span style={{ color: 'var(--content-tertiary)' }}> · {e.trackingId}</span>}
                  </div>
                  <div style={{ font: 'var(--text-body-sm)', color: 'var(--content-secondary)' }}>{e.reason}</div>
                </div>
                <time className="tabular" style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)', whiteSpace: 'nowrap' }}>
                  {new Date(e.createdAt).toLocaleTimeString('en-GB')}
                </time>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <span style={{ font: 'var(--text-h3)' }}>Carrier patterns</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {formats.map((f) => (
                <div
                  key={f.carrier}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)' }}
                >
                  <span style={{ font: 'var(--text-label)' }}>{f.carrier}</span>
                  <span className="mono" style={{ font: 'var(--text-caption)', color: 'var(--content-secondary)' }}>
                    {f.pattern}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Field label="Carrier name" value={newCarrier} onChange={(e) => setNewCarrier(e.target.value)} placeholder="DPD" />
              <Field
                label="Pattern (anchored regex)"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="^05[0-9]{12}$"
                errorText={patternError ?? undefined}
              />
              <Button variant="secondary" onClick={addCarrierPattern} disabled={!newCarrier || !newPattern} disabledReason="Enter a carrier name and pattern">
                Add pattern
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <span style={{ font: 'var(--text-h3)' }}>Storage locations</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {locations.map((l) => (
                <Chip key={l.locationId} active={l.isOccupied}>
                  {l.locationId} {l.isOccupied ? '(occupied)' : ''}
                </Chip>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Field label="Location ID" value={newLocationId} onChange={(e) => setNewLocationId(e.target.value)} placeholder="RACK-D-01" />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['RACK', 'TROLLEY', 'STAGING'] as const).map((t) => (
                  <Chip key={t} active={newLocationType === t} onClick={() => setNewLocationType(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
              <Button variant="secondary" onClick={addLocation} disabled={!newLocationId.trim()} disabledReason="Enter a location ID">
                Register location
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
