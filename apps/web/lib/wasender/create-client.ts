import { createRequire } from "node:module";
import type { RetryConfig, Wasender } from "wasenderapi";

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

export function createAccountWasenderClient(personalAccessToken: string): Wasender {
  return createWasender(
    undefined,
    personalAccessToken,
    BASE_URL,
    undefined,
    RETRY_CONFIG
  );
}
