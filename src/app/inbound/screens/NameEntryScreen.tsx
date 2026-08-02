'use client';

/**
 * Step 2, Path B — manual recipient name entry (docs/03-APP2-INBOUND.md
 * §4.3). Gate C6 (known name → AD lookup), C7 ("Unknown" → no AD query at
 * all, observable in the ops console).
 */

import { useEffect, useState } from 'react';
import { Field } from '../../../design/components/Field';
import { Button } from '../../../design/components/Button';
import { Chip } from '../../../design/components/Card';

interface ResolvedRecipient {
  recipientName: string | null;
  department: string | null;
  email: string | null;
}

interface DirectoryUser {
  ntUserId: string;
  recipientName: string;
  department: string | null;
}

export function NameEntryScreen({ onResolved }: { onResolved: (name: string, resolved: ResolvedRecipient) => void }) {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<DirectoryUser[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!name.trim() || name.trim().toLowerCase() === 'unknown') {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/inbound/directory?q=${encodeURIComponent(name)}`)
        .then((res) => res.json())
        .then((data: { results: DirectoryUser[] }) => setSuggestions(data.results))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [name]);

  const submit = async (finalName: string) => {
    if (!finalName.trim()) return;
    setPending(true);
    try {
      const res = await fetch('/api/inbound/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: finalName }),
      });
      const resolved: ResolvedRecipient = await res.json();
      onResolved(finalName, resolved);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-5)' }}>
      <h2 style={{ font: 'var(--text-h2)', margin: 0, textAlign: 'center' }}>
        Enter recipient&rsquo;s full name from package label
      </h2>
      <p style={{ font: 'var(--text-body-sm)', color: 'var(--content-secondary)', textAlign: 'center', margin: 0 }}>
        If no name is visible on the package, enter &ldquo;Unknown&rdquo;.
      </p>

      <Field
        label="Recipient name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit(name);
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <Chip onClick={() => setName('Unknown')}>Unknown</Chip>
        {suggestions.map((s) => (
          <Chip key={s.ntUserId} onClick={() => setName(s.recipientName)}>
            {s.recipientName}
            {s.department ? ` · ${s.department}` : ''}
          </Chip>
        ))}
      </div>

      <Button
        variant="primary"
        size="primary"
        fullWidth
        disabled={!name.trim()}
        disabledReason="Enter a name, or tap Unknown"
        loading={pending}
        onClick={() => submit(name)}
      >
        Next
      </Button>
    </div>
  );
}
