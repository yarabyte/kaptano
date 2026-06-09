const SYNC_TAG = "sync-leads";

export async function registerBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg) {
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(SYNC_TAG);
    } else {
      const { syncPendingLeads } = await import("./db");
      await syncPendingLeads();
    }
  } catch {
    const { syncPendingLeads } = await import("./db");
    await syncPendingLeads();
  }
}

export function setupOnlineSync(): void {
  const run = () => {
    void import("./db").then(({ syncPendingLeads }) => syncPendingLeads());
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "SYNC_LEADS" });
      });
    }
  };

  window.addEventListener("online", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) run();
  });
}
