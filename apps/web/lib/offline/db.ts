import Dexie, { type Table } from "dexie";
import type { CreateLeadInput, PendingLead } from "@kaptano/shared";
import { registerBackgroundSync } from "./sync";

class KaptanoDB extends Dexie {
  pendingLeads!: Table<PendingLead, string>;

  constructor() {
    super("kaptano");
    this.version(1).stores({
      pendingLeads: "clientUuid, status, createdAt",
    });
  }
}

export const db = new KaptanoDB();

export async function queueLeadOffline(
  payload: CreateLeadInput
): Promise<string> {
  const clientUuid = payload.clientUuid ?? crypto.randomUUID();
  const entry: PendingLead = {
    clientUuid,
    payload: { ...payload, clientUuid },
    createdAt: Date.now(),
    status: "pending",
  };
  await db.pendingLeads.put(entry);
  await registerBackgroundSync();
  return clientUuid;
}

export async function syncPendingLeads(): Promise<number> {
  const pending = await db.pendingLeads
    .where("status")
    .equals("pending")
    .toArray();

  let synced = 0;

  for (const entry of pending) {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });

      if (res.ok) {
        await db.pendingLeads.update(entry.clientUuid, { status: "synced" });
        synced++;
      } else if (res.status >= 400 && res.status < 500) {
        await db.pendingLeads.update(entry.clientUuid, { status: "failed" });
      }
    } catch {
      break;
    }
  }

  return synced;
}

export async function getPendingCount(): Promise<number> {
  return db.pendingLeads.where("status").equals("pending").count();
}
