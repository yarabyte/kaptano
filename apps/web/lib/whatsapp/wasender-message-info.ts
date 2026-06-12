import { WasenderAPIError } from "wasenderapi";
import type { WasenderMessageInfoPayload } from "@kaptano/db";

const BASE_URL =
  process.env.WASENDER_API_BASE ?? "https://www.wasenderapi.com/api";

type MessageInfoResponse = {
  success?: boolean;
  message?: string;
  data?: WasenderMessageInfoPayload;
};

export async function fetchWasenderMessageInfo(
  apiKey: string,
  msgId: string
): Promise<WasenderMessageInfoPayload | null> {
  if (!/^\d+$/.test(msgId)) return null;

  const res = await fetch(`${BASE_URL}/messages/${msgId}/info`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const body = (await res.json()) as MessageInfoResponse;

  if (!res.ok || body.success === false) {
    if (res.status === 404) return null;
    throw new WasenderAPIError(
      body.message ?? `Impossible de récupérer le statut du message ${msgId}`,
      res.status
    );
  }

  return body.data ?? null;
}
