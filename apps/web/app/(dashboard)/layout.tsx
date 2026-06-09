import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterNavForRole } from "@/lib/dashboard-nav";
import { QuotaBanner } from "@/components/dashboard/quota-banner";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-nav";
import type { UserRole } from "@kaptano/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuth();

  if (ctx.role === "PLATFORM_ADMIN") {
    redirect("/platform");
  }

  const tenant = ctx.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true },
      })
    : null;

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
        tenantName={tenant?.name}
        signOut={signOut}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileNav items={visibleNav} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            <QuotaBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
