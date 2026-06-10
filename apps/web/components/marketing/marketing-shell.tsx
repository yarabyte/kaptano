import { getSessionUser } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { marketingSignOut } from "@/app/(marketing)/actions";

export async function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const dashboardHref = user?.role === "PLATFORM_ADMIN" ? "/platform" : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-white to-accent/30">
      <MarketingHeader
        isAuthenticated={!!user}
        dashboardHref={dashboardHref}
        signOut={marketingSignOut}
      />
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
