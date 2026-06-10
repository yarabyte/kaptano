import { createRequire } from "node:module";
import type { RetryConfig, Wasender } from "wasenderapi";
import {
  parseRateLimitHeaders,
  recordRateLimitSnapshot,
} from "@/lib/whatsapp/rate-limits";

const cjsRequire = createRequire(__filename);
const { createWasender } = cjsRequire("wasenderapi") as {
  createWasender: (
    apiKey?: string,
    personalAccessToken?: string,
    baseUrl?: string,
    fetchImplementation?: typeof fetch,
    retryOptions?: RetryConfig,
    webhookSecret?: string
  ) => Wasender;
};

const BASE_URL =
  process.env.WASENDER_API_BASE ?? "https://www.wasenderapi.com/api";
const RETRY_CONFIG: RetryConfig = { enabled: true, maxRetries: 3 };

function rateLimitAwareFetch(): typeof fetch {
  return async (input, init) => {
    const res = await fetch(input, init);
    const snapshot = parseRateLimitHeaders(res.headers);
    if (snapshot) {
      void recordRateLimitSnapshot(snapshot).catch(() => undefined);
    }
    return res;
  };
}

export function createAccountWasenderClient(personalAccessToken: string): Wasender {
  return createWasender(
    undefined,
    personalAccessToken,
    BASE_URL,
    undefined,
    RETRY_CONFIG
  );
}

export function createSessionWasenderClient(sessionApiKey: string): Wasender {
  return createWasender(
    sessionApiKey,
    undefined,
    BASE_URL,
    rateLimitAwareFetch(),
    RETRY_CONFIG
  );
}
