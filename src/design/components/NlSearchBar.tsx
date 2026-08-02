'use client';

/**
 * Natural-language search (docs/09-SCOPE-CONFERENCE-DEMO.md §6). Applies the
 * model's structured filter through the exact same update() path the manual
 * chips use, so the chips visibly populate — the user sees what was
 * understood and can adjust it by hand. On any failure (no API key,
 * unreachable, invalid output), degrades quietly to plain text search rather
 * than surfacing an error (risk R14 — the demo must survive a dead network).
 */

import { useState } from 'react';
import { Button } from './Button';
import type { ParcelFiltersState } from '../../lib/dashboard-types';

interface AiSearchResponse {
  ok: boolean;
  filter?: {
    carrier?: string[];
    status?: ('STORED' | 'IN_TRANSIT' | 'DELIVERED')[];
    recipient?: string;
    department?: string;
    dateFrom?: string;
    dateTo?: string;
    locationType?: 'RACK' | 'TROLLEY' | 'STAGING';
    explanation: string;
  };
  reason?: string;
}

export function NlSearchBar({ onApply }: { onApply: (patch: Partial<ParcelFiltersState>) => void }) {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setPending(true);
    setNote(null);
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data: AiSearchResponse = await res.json();

      if (data.ok && data.filter) {
        const f = data.filter;
        onApply({
          carrier: f.carrier ?? [],
          status: f.status ?? [],
          recipient: f.recipient ?? '',
          department: f.department ?? '',
          locationType: f.locationType ?? 'ALL',
          datePreset: f.dateFrom && f.dateTo ? 'custom' : 'all',
          dateFrom: f.dateFrom ?? '',
          dateTo: f.dateTo ?? '',
          search: '',
        });
        setNote(f.explanation);
      } else {
        // Degrade to plain text search — the dashboard never breaks because the AI is unavailable.
        onApply({ search: trimmed });
        setNote(data.reason ? `${data.reason} Showing text search instead.` : 'Showing text search instead.');
      }
    } catch {
      onApply({ search: trimmed });
      setNote('AI search unreachable. Showing text search instead.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ai-accent)',
            }}
          >
            ✦
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Ask in plain language — e.g. &ldquo;DHL parcels from this week&rdquo;"
            style={{
              width: '100%',
              height: 'var(--target-min)',
              padding: `0 var(--space-4) 0 var(--space-10)`,
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--ai-accent)',
              background: 'var(--ai-surface)',
              color: 'var(--content-primary)',
              font: 'var(--text-body)',
            }}
          />
        </div>
        <Button variant="ai" loading={pending} onClick={submit} disabled={!query.trim()} disabledReason="Type a question first">
          Ask
        </Button>
      </div>
      {note && (
        <span style={{ font: 'var(--text-caption)', color: 'var(--content-secondary)' }}>{note}</span>
      )}
    </div>
  );
}
