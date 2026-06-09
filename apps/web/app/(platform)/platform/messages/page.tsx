import { loadPlatformFailedJobs } from "@/lib/platform/data";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DbAlert } from "@/components/platform/db-alert";
import { formatDate } from "@/lib/utils";

export default async function PlatformMessagesPage() {
  let jobs: Awaited<ReturnType<typeof loadPlatformFailedJobs>> = [];
  let dbError: string | null = null;

  try {
    jobs = await loadPlatformFailedJobs();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur base de données";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages en échec"
        description="Jobs WhatsApp qui n'ont pas pu être envoyés"
      />

      {dbError && <DbAlert />}

      {!dbError && (
        <div className="space-y-3">
          {jobs.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Aucun message en échec — tout fonctionne correctement.
              </CardContent>
            </Card>
          )}

          {jobs.map((job) => (
            <Card key={job.id} className="border-destructive/20 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {job.tenant.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        — {job.lead.fullName}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {job.lead.whatsappNumber}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {job.createdAt ? formatDate(job.createdAt) : "—"}
                  </p>
                </div>
                <p className="mt-3 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {job.lastError ?? "Erreur inconnue"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
