export type {
  CreateLeadInput,
  SignupInput,
  CreateStandInput,
  CreateCatalogInput,
  InviteAgentInput,
  WasenderWebhookPayload,
  LeadFilters,
} from "./schemas";

export type TenantContext = {
  tenantId: string;
  userId: string;
  role: "PLATFORM_ADMIN" | "EXHIBITOR_ADMIN" | "AGENT";
  email: string;
  fullName: string | null;
};

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export type StandWithRelations = {
  id: string;
  name: string;
  qrToken: string;
  active: boolean;
  catalogId: string | null;
  eventId: string | null;
  createdAt: Date;
};

export type LeadWithMessage = {
  id: string;
  fullName: string;
  whatsappNumber: string;
  email: string | null;
  company: string | null;
  interest: string | null;
  source: string;
  optInConsent: boolean;
  capturedAt: Date;
  stand: { id: string; name: string } | null;
  messageJobs: Array<{
    id: string;
    status: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    catalogClickedAt: Date | null;
  }>;
};

export type PendingLead = {
  clientUuid: string;
  payload: CreateLeadInput;
  createdAt: number;
  status: "pending" | "synced" | "failed";
};

import type { CreateLeadInput } from "./schemas";
