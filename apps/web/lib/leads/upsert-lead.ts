import type { CreateLeadInput } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import { normalizePhoneToE164 } from "@/lib/phone";
import { getCurrentPeriod } from "@/lib/utils";
import { assertLeadQuota } from "@/lib/leads/check-quota";

export type LeadUpsertResult = {
  lead: { id: string; fullName: string; whatsappNumber: string };
  isNew: boolean;
};

export async function upsertLead(
  tenantId: string,
  input: CreateLeadInput,
  standId?: string
): Promise<LeadUpsertResult> {
  const whatsappNumber = normalizePhoneToE164(input.whatsappNumber);
  if (!whatsappNumber) {
    throw new Error("Numéro WhatsApp invalide");
  }

  if (input.clientUuid) {
    const existingByUuid = await prisma.lead.findUnique({
      where: {
        tenantId_clientUuid: { tenantId, clientUuid: input.clientUuid },
      },
    });
    if (existingByUuid) {
      return {
        lead: {
          id: existingByUuid.id,
          fullName: existingByUuid.fullName,
          whatsappNumber: existingByUuid.whatsappNumber,
        },
        isNew: false,
      };
    }
  }

  const existingByPhone = await prisma.lead.findUnique({
    where: {
      tenantId_whatsappNumber: { tenantId, whatsappNumber },
    },
  });

  if (existingByPhone) {
    const updated = await prisma.lead.update({
      where: { id: existingByPhone.id },
      data: {
        fullName: input.fullName,
        email: input.email || null,
        company: input.company || null,
        interest: input.interest || null,
        standId: standId ?? existingByPhone.standId,
        clientUuid: input.clientUuid ?? existingByPhone.clientUuid,
      },
    });
    return {
      lead: {
        id: updated.id,
        fullName: updated.fullName,
        whatsappNumber: updated.whatsappNumber,
      },
      isNew: false,
    };
  }

  const period = getCurrentPeriod();

  await assertLeadQuota(tenantId);

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        tenantId,
        standId,
        fullName: input.fullName,
        whatsappNumber,
        email: input.email || null,
        company: input.company || null,
        interest: input.interest || null,
        source: input.source,
        capturedById: input.capturedById,
        optInConsent: input.optInConsent,
        consentAt: input.optInConsent ? new Date() : null,
        clientUuid: input.clientUuid,
      },
    });

    await tx.usageRecord.upsert({
      where: { tenantId_period: { tenantId, period } },
      create: { tenantId, period, leadsCount: 1 },
      update: { leadsCount: { increment: 1 } },
    });

    return created;
  });

  return {
    lead: {
      id: lead.id,
      fullName: lead.fullName,
      whatsappNumber: lead.whatsappNumber,
    },
    isNew: true,
  };
}
