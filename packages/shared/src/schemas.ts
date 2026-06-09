import { z } from "zod";
import {
  WHATSAPP_MESSAGE_TYPES,
  documentMessageConfigSchema,
  imageMessageConfigSchema,
  pollMessageConfigSchema,
  textMessageConfigSchema,
} from "./whatsapp-message";

export const e164PhoneSchema = z
  .string()
  .min(8)
  .regex(/^\+[1-9]\d{6,14}$/, "Numéro WhatsApp invalide (format E.164 requis)");

export const createLeadSchema = z.object({
  qrToken: z.string().min(1).optional(),
  standId: z.string().cuid().optional(),
  tenantId: z.string().cuid().optional(),
  fullName: z.string().min(2).max(120),
  whatsappNumber: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().max(120).optional(),
  interest: z.string().max(500).optional(),
  source: z.enum(["QR_SELF", "AGENT"]),
  capturedById: z.string().cuid().optional(),
  optInConsent: z.literal(true, {
    errorMap: () => ({ message: "Le consentement opt-in est obligatoire" }),
  }),
  clientUuid: z.string().uuid().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(120),
  companyName: z.string().min(2).max(120),
  companySlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug invalide (a-z, 0-9, tirets)"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const createStandSchema = z.object({
  name: z.string().min(1).max(120),
  eventId: z.string().cuid().optional(),
  catalogId: z.string().cuid().optional(),
  active: z.boolean().optional(),
});

export type CreateStandInput = z.infer<typeof createStandSchema>;

export const updateStandSchema = createStandSchema.partial();

export const createCatalogSchema = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().optional(),
});

export type CreateCatalogInput = z.infer<typeof createCatalogSchema>;

export const updateTenantSettingsSchema = z.object({
  messageType: z.enum(WHATSAPP_MESSAGE_TYPES).optional(),
  messageConfig: z.unknown().optional(),
});

export const manualDispatchFiltersSchema = z.object({
  standId: z.string().cuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ManualDispatchFilters = z.infer<typeof manualDispatchFiltersSchema>;

export function validateWhatsappMessageSettings(input: {
  messageType?: (typeof WHATSAPP_MESSAGE_TYPES)[number];
  messageConfig?: unknown;
}): void {
  if (!input.messageType || input.messageConfig === undefined) return;

  switch (input.messageType) {
    case "IMAGE":
      imageMessageConfigSchema.parse(input.messageConfig);
      break;
    case "DOCUMENT":
      documentMessageConfigSchema.parse(input.messageConfig);
      break;
    case "POLL":
      pollMessageConfigSchema.parse(input.messageConfig);
      break;
    default:
      textMessageConfigSchema.parse(input.messageConfig);
  }
}

export const inviteAgentSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
});

export type InviteAgentInput = z.infer<typeof inviteAgentSchema>;

export const wasenderWebhookSchema = z.object({
  event: z.string(),
  data: z.record(z.unknown()),
});

export type WasenderWebhookPayload = z.infer<typeof wasenderWebhookSchema>;

export const leadFiltersSchema = z.object({
  standId: z.string().cuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().optional(),
  messageStatus: z
    .enum(["QUEUED", "SENDING", "SENT", "DELIVERED", "READ", "FAILED", "NONE"])
    .optional(),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;

export const initiatePaymentSchema = z.object({
  planTier: z.enum(["STARTER", "GROWTH", "SCALE"]),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const createEventSchema = z.object({
  name: z.string().min(1).max(120),
  location: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();

export const updateCatalogSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
});
