import { Suspense } from "react";
import { DashboardAuthShell } from "@/components/dashboard/dashboard-auth-shell";
import { DashboardLayoutSkeleton } from "@/components/dashboard/page-loading";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <DashboardAuthShell>{children}</DashboardAuthShell>
    </Suspense>
  );
}
