const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function appBaseUrl(): string {
  return APP_URL.replace(/\/$/, "");
}

export function getTenantWebhookUrl(tenantId: string): string {
  return `${appBaseUrl()}/api/webhooks/wasender/${tenantId}`;
}

export function getSharedWebhookUrl(): string {
  return `${appBaseUrl()}/api/webhooks/wasender/shared`;
}
