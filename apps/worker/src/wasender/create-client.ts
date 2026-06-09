import { createRequire } from "node:module";
import type { RetryConfig, Wasender } from "wasenderapi";

// Le build ESM du SDK (v0.4) a des paramètres dans le désordre — on force le CJS.
const require = createRequire(__filename);
const { createWasender } = require("wasenderapi") as {
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

export function createSessionWasenderClient(sessionApiKey: string): Wasender {
  return createWasender(sessionApiKey, undefined, BASE_URL, undefined, RETRY_CONFIG);
}
