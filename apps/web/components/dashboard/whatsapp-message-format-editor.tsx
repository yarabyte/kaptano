"use client";

import { FileText, ImageIcon, Loader2, Upload } from "lucide-react";
import {
  type WhatsappMessageType,
  type WhatsappMessageConfig,
  type DocumentMessageConfig,
} from "@kaptano/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  ListChecks,
} from "lucide-react";
import { WhatsappTextEditor } from "@/components/dashboard/whatsapp-text-editor";

const MESSAGE_TYPES = [
  { type: "TEXT" as const, label: "Texte", icon: MessageSquare, accent: "text-blue-600 bg-blue-50 border-blue-200" },
  { type: "IMAGE" as const, label: "Image", icon: ImageIcon, accent: "text-violet-600 bg-violet-50 border-violet-200" },
  { type: "DOCUMENT" as const, label: "Document", icon: FileText, accent: "text-amber-600 bg-amber-50 border-amber-200" },
  { type: "POLL" as const, label: "Sondage", icon: ListChecks, accent: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

const textareaClass =
  "flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type DefaultCatalog = { id: string; name: string; createdAt: string };

type WhatsappMessageFormatEditorProps = {
  messageType: WhatsappMessageType;
  messageConfig: WhatsappMessageConfig;
  defaultCatalog: DefaultCatalog | null;
  documentName: string;
  documentUploading: boolean;
  documentUploadProgress: number | null;
  imageUploading: boolean;
  imageUploadProgress: number | null;
  imagePreviewUrl: string | null;
  onChangeType: (type: WhatsappMessageType) => void;
  onUpdateConfig: (patch: Partial<WhatsappMessageConfig>) => void;
  onDocumentNameChange: (name: string) => void;
  onDocumentFileSelect: (file: File | null) => void;
  onImageFileSelect: (file: File | null) => void;
};

function UploadProgressBar({
  label,
  progress,
}: {
  label: string;
  progress: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {label}
        </span>
        <span className="font-medium tabular-nums">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function WhatsappMessageFormatEditor({
  messageType,
  messageConfig,
  defaultCatalog,
  documentName,
  documentUploading,
  documentUploadProgress,
  imageUploading,
  imageUploadProgress,
  imagePreviewUrl,
  onChangeType,
  onUpdateConfig,
  onDocumentNameChange,
  onDocumentFileSelect,
  onImageFileSelect,
}: WhatsappMessageFormatEditorProps) {
  const pollOptions =
    messageType === "POLL" && "options" in messageConfig ? messageConfig.options : [];

  const docConfig =
    messageType === "DOCUMENT" ? (messageConfig as DocumentMessageConfig) : null;

  const imageUrl =
    messageType === "IMAGE" && "imageUrl" in messageConfig
      ? messageConfig.imageUrl
      : "";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MESSAGE_TYPES.map(({ type, label, icon: Icon, accent }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChangeType(type)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
              messageType === type
                ? cn("border-primary/40 ring-1 ring-primary/20 shadow-sm", accent)
                : "border-border/60 hover:bg-muted/40"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Variables :</span>
        {["{prenom}", "{entreprise}", "{lien}"].map((v) => (
          <code
            key={v}
            className="rounded-md border bg-muted/60 px-2 py-0.5 font-mono text-xs text-foreground"
          >
            {v}
          </code>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        {messageType === "TEXT" && "text" in messageConfig && (
          <WhatsappTextEditor
            value={messageConfig.text ?? ""}
            onChange={(text) => onUpdateConfig({ text })}
          />
        )}

        {messageType === "IMAGE" && "imageUrl" in messageConfig && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image depuis votre ordinateur</Label>
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors",
                  imageUploading
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/80 hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {imageUploading ? "Envoi en cours…" : "Cliquez ou déposez une image"}
                </span>
                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF — max 5 Mo</span>
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="sr-only"
                  disabled={imageUploading}
                  onChange={(e) => onImageFileSelect(e.target.files?.[0] ?? null)}
                />
              </label>
              {imageUploading && imageUploadProgress != null && (
                <UploadProgressBar label="Upload de l'image" progress={imageUploadProgress} />
              )}
            </div>

            {(imagePreviewUrl || imageUrl) && !imageUploading && (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl ?? imageUrl}
                  alt="Aperçu"
                  className="max-h-48 w-full object-contain bg-muted/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Ou URL publique</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => onUpdateConfig({ imageUrl: e.target.value })}
                disabled={imageUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageCaption">Légende (optionnel)</Label>
              <Input
                id="imageCaption"
                placeholder="Légende du message"
                value={messageConfig.text ?? ""}
                onChange={(e) => onUpdateConfig({ text: e.target.value })}
              />
            </div>
          </div>
        )}

        {docConfig && (
          <div className="space-y-4">
            {defaultCatalog && !documentUploading && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">{defaultCatalog.name}</span>
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="documentName">Nom du document</Label>
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => onDocumentNameChange(e.target.value)}
                placeholder="Catalogue"
                disabled={documentUploading}
              />
            </div>

            <div className="space-y-2">
              <Label>Fichier PDF</Label>
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors",
                  documentUploading
                    ? "border-amber-400/50 bg-amber-50/50"
                    : "border-border/80 hover:border-amber-400/50 hover:bg-muted/30"
                )}
              >
                <FileText className="h-6 w-6 text-amber-600" />
                <span className="text-sm font-medium">
                  {documentUploading
                    ? "Chargement automatique…"
                    : defaultCatalog
                      ? "Remplacer le PDF"
                      : "Sélectionnez un PDF — envoi automatique"}
                </span>
                <span className="text-xs text-muted-foreground">Le fichier sera chargé dès la sélection</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  disabled={documentUploading}
                  onChange={(e) => {
                    onDocumentFileSelect(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>

              {documentUploading && documentUploadProgress != null && (
                <UploadProgressBar label="Upload du document" progress={documentUploadProgress} />
              )}
            </div>
          </div>
        )}

        {messageType === "POLL" && "question" in messageConfig && (
          <div className="space-y-3">
            <Input
              value={messageConfig.question}
              onChange={(e) => onUpdateConfig({ question: e.target.value })}
              placeholder="Question du sondage"
            />
            <textarea
              rows={4}
              className={textareaClass}
              value={pollOptions.join("\n")}
              onChange={(e) =>
                onUpdateConfig({
                  options: e.target.value
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean),
                })
              }
              placeholder={"Option 1\nOption 2"}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="multiSelect"
                checked={messageConfig.multiSelect ?? false}
                onCheckedChange={(c) => onUpdateConfig({ multiSelect: c === true })}
              />
              <Label htmlFor="multiSelect" className="font-normal">
                Réponses multiples
              </Label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function getMessageTypeLabel(type: WhatsappMessageType): string {
  return MESSAGE_TYPES.find((t) => t.type === type)?.label ?? type;
}

export function validateMessageSettings(
  messageType: WhatsappMessageType,
  messageConfig: WhatsappMessageConfig,
  defaultCatalog: DefaultCatalog | null
): string | null {
  switch (messageType) {
    case "TEXT":
      if (!("text" in messageConfig) || !messageConfig.text?.trim()) {
        return "Saisissez le texte du message.";
      }
      return null;
    case "IMAGE": {
      const url =
        "imageUrl" in messageConfig ? messageConfig.imageUrl?.trim() ?? "" : "";
      if (!url || url.includes("example.com")) {
        return "Chargez une image ou indiquez une URL valide.";
      }
      return null;
    }
    case "DOCUMENT":
      if (!defaultCatalog) {
        return "Chargez un document PDF avant de continuer.";
      }
      return null;
    case "POLL":
      if (!("question" in messageConfig) || !messageConfig.question?.trim()) {
        return "Saisissez la question du sondage.";
      }
      if (!messageConfig.options || messageConfig.options.length < 2) {
        return "Ajoutez au moins 2 options au sondage.";
      }
      return null;
    default:
      return null;
  }
}

export function getMessagePreview(
  messageType: WhatsappMessageType,
  messageConfig: WhatsappMessageConfig,
  defaultCatalog: DefaultCatalog | null
): string {
  switch (messageType) {
    case "TEXT":
      return "text" in messageConfig ? messageConfig.text?.trim() || "—" : "—";
    case "IMAGE": {
      const caption =
        "text" in messageConfig && messageConfig.text?.trim()
          ? messageConfig.text.trim()
          : null;
      const hasImage =
        "imageUrl" in messageConfig && !!messageConfig.imageUrl?.trim();
      if (caption && hasImage) return `${caption} [image jointe]`;
      if (hasImage) return "Image jointe";
      return caption ?? "—";
    }
    case "DOCUMENT":
      return defaultCatalog?.name ?? "Aucun document";
    case "POLL":
      if ("question" in messageConfig) {
        const opts = messageConfig.options?.length ?? 0;
        return `${messageConfig.question} (${opts} option${opts !== 1 ? "s" : ""})`;
      }
      return "—";
    default:
      return "—";
  }
}
