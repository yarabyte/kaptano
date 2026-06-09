import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { messageJobId: string } }
) {
  const job = await prisma.messageJob.findUnique({
    where: { id: params.messageJobId },
    include: {
      lead: {
        include: {
          stand: {
            include: {
              catalog: true,
              tenant: { include: { catalogs: { where: { isDefault: true }, take: 1 } } },
            },
          },
        },
      },
    },
  });

  if (!job) {
    return new Response("Lien invalide", { status: 404 });
  }

  const catalog =
    job.lead.stand?.catalog ??
    job.lead.stand?.tenant.catalogs[0] ??
    null;

  if (!catalog?.publicUrl) {
    return new Response("Catalogue indisponible", { status: 404 });
  }

  if (!job.catalogClickedAt) {
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { catalogClickedAt: new Date() },
    });
  }

  redirect(catalog.publicUrl);
}
