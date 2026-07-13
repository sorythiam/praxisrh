'use client';

/**
 * Offline-first clock-in/out queue (section 6.3: "le pointage ... fonctionne
 * sans connexion, avec synchronisation automatique"). Every clock event is
 * written to IndexedDB immediately — before any network call — tagged with
 * a client-generated id so a retried sync can never create a duplicate
 * event server-side (the API's clock_events unique constraint on
 * (tenantId, clientEventId) enforces that). Sync is attempted on page
 * load, whenever the browser regains connectivity, and on demand; queued
 * events survive a full page reload or browser restart since they live in
 * IndexedDB, not memory.
 */

const DB_NAME = 'praxis-offline';
const STORE_NAME = 'clock-events';
const DB_VERSION = 1;

export interface QueuedClockEvent {
  clientEventId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'clientEventId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueClockEvent(event: QueuedClockEvent): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedEvents(): Promise<QueuedClockEvent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedClockEvent[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedEvent(clientEventId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(clientEventId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getGeolocation(): Promise<{ latitude?: number; longitude?: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 3000 },
    );
  });
}
