'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // offline capability degrades gracefully without the SW —
        // the IndexedDB queue itself doesn't depend on it
      });
    }
  }, []);
  return null;
}
