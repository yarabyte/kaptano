import { Suspense } from "react";
import { PlatformAuthShell } from "@/components/platform/platform-auth-shell";
import { PlatformLayoutSkeleton } from "@/components/dashboard/page-loading";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PlatformLayoutSkeleton />}>
      <PlatformAuthShell>{children}</PlatformAuthShell>
    </Suspense>
  );
}
