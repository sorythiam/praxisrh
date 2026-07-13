'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { api, fetcher } from '@/lib/api-client';
import { enqueueClockEvent, getGeolocation, getQueuedEvents, removeQueuedEvent, QueuedClockEvent } from '@/lib/offline-queue';

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function PointeusePage() {
  const { data: events, mutate } = useSWR<any[]>('/rh/timeclock/my', fetcher);
  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const refreshQueueCount = useCallback(async () => {
    const queued = await getQueuedEvents();
    setQueuedCount(queued.length);
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const queued = await getQueuedEvents();
      if (queued.length === 0) return;
      const results = await api.post<{ clientEventId: string; status: string }[]>('/rh/timeclock/sync', {
        events: queued,
      });
      for (const r of results) {
        if (r.status === 'created' || r.status === 'already_synced') {
          await removeQueuedEvent(r.clientEventId);
        }
      }
      await refreshQueueCount();
      mutate();
    } catch {
      // stays queued, will retry on next sync trigger
    } finally {
      setSyncing(false);
    }
  }, [mutate, refreshQueueCount]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshQueueCount();
    sync();
    const onOnline = () => {
      setOnline(true);
      sync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function clock(type: QueuedClockEvent['type']) {
    const geo = await getGeolocation();
    const event: QueuedClockEvent = {
      clientEventId: uuid(),
      type,
      timestamp: new Date().toISOString(),
      ...geo,
    };
    await enqueueClockEvent(event);
    setLastAction(`${type} enregistré à ${new Date().toLocaleTimeString('fr-FR')}`);
    await refreshQueueCount();
    sync();
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Pointeuse</h1>

      <div className={`rounded-md p-3 text-sm ${online ? 'bg-praxis-50 text-praxis-700' : 'bg-amber-50 text-amber-800'}`}>
        {online ? 'En ligne' : 'Hors connexion — le pointage sera synchronisé au retour du réseau'}
        {queuedCount > 0 && (
          <div className="mt-1">
            {queuedCount} pointage(s) en attente de synchronisation
            {syncing && ' — synchronisation…'}
          </div>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-3">
        <button className="btn py-4 text-base" onClick={() => clock('CLOCK_IN')}>
          Arrivée
        </button>
        <button className="btn-secondary py-4 text-base" onClick={() => clock('CLOCK_OUT')}>
          Départ
        </button>
        <button className="btn-secondary py-3" onClick={() => clock('BREAK_START')}>
          Début pause
        </button>
        <button className="btn-secondary py-3" onClick={() => clock('BREAK_END')}>
          Fin pause
        </button>
      </div>

      {lastAction && <p className="text-sm text-gray-500">{lastAction}</p>}

      <div className="card">
        <h2 className="font-semibold">Derniers pointages</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {events?.map((e) => (
            <li key={e.id} className="flex justify-between">
              <span>{e.type}</span>
              <span className="text-gray-500">{new Date(e.timestamp).toLocaleString('fr-FR')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
