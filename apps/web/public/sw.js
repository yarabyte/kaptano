const DB_NAME = "kaptano";
const STORE_NAME = "pendingLeads";
const SYNC_TAG = "sync-leads";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "clientUuid" });
      }
    };
  });
}

async function getPendingLeads() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const all = req.result ?? [];
      resolve(all.filter((e) => e.status === "pending"));
    };
  });
}

async function markSynced(clientUuid, status) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(clientUuid);
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (!entry) {
        resolve();
        return;
      }
      entry.status = status;
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

async function syncPendingLeads() {
  const pending = await getPendingLeads();
  for (const entry of pending) {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      if (res.ok) {
        await markSynced(entry.clientUuid, "synced");
      } else if (res.status >= 400 && res.status < 500) {
        await markSynced(entry.clientUuid, "failed");
      }
    } catch {
      break;
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingLeads());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_LEADS") {
    event.waitUntil(syncPendingLeads());
  }
});
