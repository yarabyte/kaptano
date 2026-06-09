export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-float">
      <div className="absolute -right-6 top-8 hidden rounded-2xl border border-border/60 bg-white px-4 py-3 shadow-lg lg:block">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Sync offline
        </p>
        <p className="mt-0.5 text-sm font-semibold text-emerald-600">3 leads en attente</p>
      </div>

      <div className="absolute -left-4 bottom-24 hidden rounded-2xl border border-primary/20 bg-white px-4 py-3 shadow-lg lg:block">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Envoi manuel
        </p>
        <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[68%] rounded-full bg-primary" />
        </div>
        <p className="mt-1 text-[10px] font-medium text-primary">68% · 34/50 leads</p>
      </div>

      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-white shadow-2xl shadow-primary/15">
        <div className="flex items-center gap-2 border-b bg-gradient-to-r from-accent/60 to-white px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-400/80" />
          <div className="h-3 w-3 rounded-full bg-amber-400/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            Dashboard Kaptano
          </span>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Leads", value: "127" },
              { label: "Envoyés", value: "98" },
              { label: "Lus", value: "64" },
              { label: "Échecs", value: "2" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/60 bg-gradient-to-b from-white to-accent/20 p-2 text-center"
              >
                <p className="font-heading text-base font-bold text-primary">{stat.value}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-white shadow-sm">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="currentColor">
                  <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Stand Foire BTP 2026</p>
                <p className="text-xs text-muted-foreground">Catalogue PDF · envoi manuel</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  WhatsApp connecté
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            {["Texte", "Image", "PDF", "Sondage"].map((type, i) => (
              <span
                key={type}
                className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                  i === 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {type}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {[
              { name: "Marie N.", status: "lu ✓", color: "text-emerald-600" },
              { name: "Jean K.", status: "livré", color: "text-primary" },
              { name: "Paul A.", status: "en cours…", color: "text-amber-600" },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2.5 text-xs transition-colors hover:border-primary/20"
              >
                <div>
                  <span className="font-medium text-foreground">{row.name}</span>
                  <span className="ml-2 text-muted-foreground">— {row.status}</span>
                </div>
                <span className={`font-bold ${row.color}`}>●</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
