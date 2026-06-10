import { Suspense } from "react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { MarketingLayoutSkeleton } from "@/components/dashboard/page-loading";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<MarketingLayoutSkeleton />}>
      <MarketingShell>{children}</MarketingShell>
    </Suspense>
  );
}
