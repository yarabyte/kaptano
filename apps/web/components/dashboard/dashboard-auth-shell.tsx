import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DatabaseUnavailableError, getSessionUser } from "@/lib/auth";
import { DatabaseUnavailable } from "@/components/dashboard/database-unavailable";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterNavForRole } from "@/lib/dashboard-nav";
import { QuotaBanner } from "@/components/dashboard/quota-banner";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-nav";
import type { UserRole } from "@kaptano/db";

export async function DashboardAuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return <DatabaseUnavailable />;
    }
    throw error;
  }

  if (!user) {
    redirect("/login");
  }

  if (user.role === "PLATFORM_ADMIN") {
    redirect("/platform");
  }

  if (!user.tenantId) {
    redirect("/login?error=no_tenant");
  }

  if (user.tenant?.status === "inactive") {
    redirect("/login?error=tenant_inactive");
  }

  const ctx = {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
  };

  const visibleNav = filterNavForRole(ctx.role as UserRole);

  async function signOut() {
    "use server";
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent/20">
      <DashboardSidebar
        items={visibleNav}
        userName={ctx.fullName ?? ctx.email}
        userEmail={ctx.email}
        role={ctx.role}
        tenantName={user.tenant?.name}
        signOut={signOut}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileNav items={visibleNav} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            <Suspense fallback={null}>
              <QuotaBanner tenantId={ctx.tenantId} />
            </Suspense>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
