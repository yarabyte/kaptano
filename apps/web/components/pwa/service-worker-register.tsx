"use client";

import { useEffect } from "react";
import { registerBackgroundSync, setupOnlineSync } from "@/lib/offline/sync";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        setupOnlineSync();
      })
      .catch(() => {
        // SW registration failed — offline sync falls back to manual
      });
  }, []);

  return null;
}

export { registerBackgroundSync };
