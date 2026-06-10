import { RATE_LIMIT_SECTION } from "@/lib/legal/content";

export function RateLimitsLegalSection() {
  return (
    <section className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 sm:p-8">
      <h2 className="font-heading text-xl font-semibold text-foreground">
        {RATE_LIMIT_SECTION.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {RATE_LIMIT_SECTION.intro}
      </p>
      <ul className="mt-5 space-y-4">
        {RATE_LIMIT_SECTION.items.map((item) => (
          <li key={item.label} className="text-sm">
            <p className="font-medium text-foreground">{item.label}</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        {RATE_LIMIT_SECTION.footer}
      </p>
    </section>
  );
}
