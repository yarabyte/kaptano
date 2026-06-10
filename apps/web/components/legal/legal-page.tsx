import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/content";

type Section = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

export function LegalPage({
  title,
  description,
  sections,
  extra,
}: {
  title: string;
  description: string;
  sections: Section[];
  extra?: ReactNode;
}) {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Link>

      <header className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Dernière mise à jour : {LEGAL_LAST_UPDATED}
        </p>
      </header>

      <div className="prose prose-slate max-w-none space-y-10 text-foreground prose-headings:font-heading prose-headings:font-semibold prose-a:text-primary">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl">{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {section.list.map((item) => (
                  <li key={item.slice(0, 40)}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {extra}
      </div>

      <footer className="mt-12 flex flex-wrap gap-4 border-t border-border/60 pt-8 text-sm text-muted-foreground">
        <Link href="/cgu" className="hover:text-primary">
          Conditions générales d&apos;utilisation
        </Link>
        <span aria-hidden>·</span>
        <Link href="/cgv" className="hover:text-primary">
          Conditions générales de vente
        </Link>
      </footer>
    </article>
  );
}
