import { waitUntil } from "@vercel/functions";

/** Exécute une tâche après la réponse HTTP (Vercel / Next.js). */
export function runInBackground(task: () => Promise<void>): void {
  waitUntil(task());
}
