'use client';

import { useEffect } from 'react';

/** Registers the passthrough service worker so the app is PWA-installable (docs/09-SCOPE-CONFERENCE-DEMO.md step 25). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failing (e.g. insecure context) shouldn't block the app.
      });
    }
  }, []);

  return null;
}
