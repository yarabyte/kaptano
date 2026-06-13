import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadsClient, type Lead, type Stand } from "./leads-client";

// Précharge les leads + stands côté serveur pour un premier rendu immédiat,
// sans l'aller-retour réseau client qui affichait auparavant un squelette.
export default async function LeadsPage() {
  const ctx = await requireTenantContext();

  const [leadRows, standRows] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        stand: { select: { id: true, name: true } },
        messageJobs: {
          select: { status: true, catalogClickedAt: true },
        },
      },
      orderBy: { capturedAt: "desc" },
      take: 100,
    }),
    prisma.stand.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const initialLeads: Lead[] = leadRows.map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    whatsappNumber: lead.whatsappNumber,
    email: lead.email,
    company: lead.company,
    source: lead.source,
    optInConsent: lead.optInConsent,
    capturedAt: lead.capturedAt.toISOString(),
    stand: lead.stand ? { id: lead.stand.id, name: lead.stand.name } : null,
    messageJobs: lead.messageJobs.map((job) => ({
      status: job.status,
      catalogClickedAt: job.catalogClickedAt ? job.catalogClickedAt.toISOString() : null,
    })),
  }));

  const initialStands: Stand[] = standRows.map((s) => ({ id: s.id, name: s.name }));

  return <LeadsClient initialLeads={initialLeads} initialStands={initialStands} />;
}
