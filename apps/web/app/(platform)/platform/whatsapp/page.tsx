import { PageHeader } from "@/components/dashboard/page-header";
import { SharedWhatsappCard } from "@/components/platform/shared-whatsapp-card";

export default function PlatformWhatsappPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp partagé"
        description="Numéro utilisé par les plans Gratuit et Starter pour l'envoi des messages"
      />
      <SharedWhatsappCard />
    </div>
  );
}
