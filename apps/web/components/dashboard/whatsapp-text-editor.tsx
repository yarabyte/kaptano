"use client";

import { useRef } from "react";
import { Bold, Italic, Strikethrough, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const textareaClass =
  "flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type WhatsappTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

type FormatWrap = {
  before: string;
  after: string;
  label: string;
  icon: typeof Bold;
};

const FORMATS: FormatWrap[] = [
  { before: "*", after: "*", label: "Gras", icon: Bold },
  { before: "_", after: "_", label: "Italique", icon: Italic },
  { before: "~", after: "~", label: "Barré", icon: Strikethrough },
  { before: "```", after: "```", label: "Monospace", icon: Code },
];

export function WhatsappTextEditor({ value, onChange, id = "textMessage" }: WhatsappTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyFormat(format: FormatWrap) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const wrapped = `${format.before}${selected || "texte"}${format.after}`;
    const nextValue = value.slice(0, start) + wrapped + value.slice(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorStart = start + format.before.length;
      const cursorEnd = cursorStart + (selected || "texte").length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-background p-1">
        {FORMATS.map((format) => {
          const Icon = format.icon;
          return (
            <Button
              key={format.label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => applyFormat(format)}
              title={format.label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{format.label}</span>
            </Button>
          );
        })}
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        rows={5}
        className={textareaClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Bonjour {prenom}, merci pour votre visite…"
      />

      <div className="rounded-lg border border-border/50 bg-background/80 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Aperçu du formatage</p>
        <WhatsappFormattedPreview text={value || "Votre message apparaîtra ici."} />
      </div>

      <p className="text-xs text-muted-foreground">
        WhatsApp : <code className="rounded bg-muted px-1">*gras*</code>,{" "}
        <code className="rounded bg-muted px-1">_italique_</code>,{" "}
        <code className="rounded bg-muted px-1">~barré~</code>,{" "}
        <code className="rounded bg-muted px-1">```monospace```</code>
      </p>
    </div>
  );
}

function WhatsappFormattedPreview({ text }: { text: string }) {
  const parts = parseWhatsappFormatting(text);

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.mono) {
          return (
            <code
              key={index}
              className="rounded bg-muted px-1 py-0.5 font-mono text-[13px]"
            >
              {part.text}
            </code>
          );
        }

        return (
          <span
            key={index}
            className={cn(
              part.bold && "font-bold",
              part.italic && "italic",
              part.strike && "line-through"
            )}
          >
            {part.text}
          </span>
        );
      })}
    </p>
  );
}

type PreviewPart = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  mono?: boolean;
};

function parseWhatsappFormatting(input: string): PreviewPart[] {
  const parts: PreviewPart[] = [];
  const regex = /```([\s\S]*?)```|\*([^*]+)\*|_([^_]+)_|~([^~]+)~/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: input.slice(lastIndex, match.index) });
    }

    if (match[1] != null) {
      parts.push({ text: match[1], mono: true });
    } else if (match[2] != null) {
      parts.push({ text: match[2], bold: true });
    } else if (match[3] != null) {
      parts.push({ text: match[3], italic: true });
    } else if (match[4] != null) {
      parts.push({ text: match[4], strike: true });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    parts.push({ text: input.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text: input }];
}
