import { get, set } from "idb-keyval";

export interface QueuedAlert {
  id: string;
  user_id: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  lat: number;
  lng: number;
  queued_at: number;
}

const KEY = "amaan_alert_queue";

export async function enqueueAlert(a: QueuedAlert) {
  const list = ((await get(KEY)) as QueuedAlert[] | undefined) ?? [];
  list.push(a);
  await set(KEY, list);
}

export async function readQueue(): Promise<QueuedAlert[]> {
  return ((await get(KEY)) as QueuedAlert[] | undefined) ?? [];
}

export async function clearQueue() {
  await set(KEY, []);
}

export async function removeFromQueue(id: string) {
  const list = await readQueue();
  await set(
    KEY,
    list.filter((a) => a.id !== id)
  );
}
