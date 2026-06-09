import { z } from "zod";
import { WHATSAPP_MESSAGE_TEMPLATE } from "./constants";

export const WHATSAPP_MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
  "DOCUMENT",
  "POLL",
] as const;

export type WhatsappMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

export type MessagePlaceholderVars = {
  prenom: string;
  entreprise: string;
  lien: string;
};

export function applyMessagePlaceholders(
  template: string,
  vars: MessagePlaceholderVars
): string {
  return template
    .replace(/\{prenom\}/g, vars.prenom)
    .replace(/\{entreprise\}/g, vars.entreprise)
    .replace(/\{lien\}/g, vars.lien);
}

export const textMessageConfigSchema = z.object({
  text: z.string().max(4096).optional(),
});

export const imageMessageConfigSchema = z.object({
  text: z.string().max(1024).optional(),
  imageUrl: z.string().url("URL d'image invalide"),
});

export const documentMessageConfigSchema = z
  .object({
    text: z.string().max(1024).optional(),
    documentUrl: z.string().url("URL de document invalide").optional(),
    fileName: z.string().max(200).optional(),
    useCatalog: z.boolean().optional(),
  })
  .refine((data) => data.useCatalog || !!data.documentUrl, {
    message: "Indiquez une URL ou activez l'envoi du catalogue",
  });

export const pollMessageConfigSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(100)).min(2).max(12),
  multiSelect: z.boolean().optional(),
});

export type TextMessageConfig = z.infer<typeof textMessageConfigSchema>;
export type ImageMessageConfig = z.infer<typeof imageMessageConfigSchema>;
export type DocumentMessageConfig = z.infer<typeof documentMessageConfigSchema>;
export type PollMessageConfig = z.infer<typeof pollMessageConfigSchema>;

export type WhatsappMessageConfig =
  | TextMessageConfig
  | ImageMessageConfig
  | DocumentMessageConfig
  | PollMessageConfig;

export const DEFAULT_TEXT_MESSAGE_CONFIG: TextMessageConfig = {
  text: WHATSAPP_MESSAGE_TEMPLATE,
};

export const DEFAULT_IMAGE_MESSAGE_CONFIG: ImageMessageConfig = {
  text: "Bonjour {prenom}, merci pour votre visite sur notre stand !",
  imageUrl: "https://example.com/image.jpg",
};

export const DEFAULT_DOCUMENT_MESSAGE_CONFIG: DocumentMessageConfig = {
  text: "Bonjour {prenom}, voici notre catalogue.",
  useCatalog: true,
};

export const DEFAULT_POLL_MESSAGE_CONFIG: PollMessageConfig = {
  question: "Quel produit vous intéresse le plus ?",
  options: ["Produit A", "Produit B", "Autre"],
  multiSelect: false,
};

export function getDefaultMessageConfig(
  type: WhatsappMessageType
): WhatsappMessageConfig {
  switch (type) {
    case "IMAGE":
      return DEFAULT_IMAGE_MESSAGE_CONFIG;
    case "DOCUMENT":
      return DEFAULT_DOCUMENT_MESSAGE_CONFIG;
    case "POLL":
      return DEFAULT_POLL_MESSAGE_CONFIG;
    default:
      return DEFAULT_TEXT_MESSAGE_CONFIG;
  }
}

export function parseWhatsappMessageConfig(
  type: WhatsappMessageType,
  config: unknown
): WhatsappMessageConfig {
  switch (type) {
    case "IMAGE":
      return imageMessageConfigSchema.parse(config);
    case "DOCUMENT":
      return documentMessageConfigSchema.parse(config);
    case "POLL":
      return pollMessageConfigSchema.parse(config);
    default:
      return textMessageConfigSchema.parse(config);
  }
}
