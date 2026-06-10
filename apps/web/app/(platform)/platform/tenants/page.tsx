import { loadPlatformTenants } from "@/lib/platform/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { DbAlert } from "@/components/platform/db-alert";
import { TenantsManager, type TenantRow } from "@/components/platform/tenants-manager";

export default async function PlatformTenantsPage() {
  let tenants: TenantRow[] = [];
  let dbError: string | null = null;

  try {
    const rows = await loadPlatformTenants();
    tenants = rows.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      subscriptionExpiresAt: t.subscriptionExpiresAt?.toISOString() ?? null,
    }));
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur base de données";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espaces exposants"
        description="Gérez les exposants : désactivation, promotion manuelle de plan et encaissement en espèces"
      />

      {dbError ? <DbAlert /> : <TenantsManager tenants={tenants} />}
    </div>
  );
}
