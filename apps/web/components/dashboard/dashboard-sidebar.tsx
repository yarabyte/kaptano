import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { DashboardNavLinks, type DashboardNavItem } from "@/components/dashboard/dashboard-nav";
import { Badge } from "@/components/ui/badge";

type DashboardSidebarProps = {
  items: DashboardNavItem[];
  userName: string;
  userEmail: string;
  role: string;
  tenantName?: string | null;
  signOut: () => Promise<void>;
};

const roleLabels: Record<string, string> = {
  EXHIBITOR_ADMIN: "Administrateur",
  AGENT: "Agent",
};

export function DashboardSidebar({
  items,
  userName,
  userEmail,
  role,
  tenantName,
  signOut,
}: DashboardSidebarProps) {
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-white md:flex lg:w-72">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Kaptano" width={32} height={32} />
          <span className="font-heading text-lg font-bold tracking-tight">Kaptano</span>
        </Link>
      </div>

      {tenantName && (
        <div className="border-b border-border/40 bg-gradient-to-br from-accent/30 to-white px-5 py-4">
          <p className="truncate text-sm font-semibold text-foreground">{tenantName}</p>
          <Badge variant="secondary" className="mt-2">
            {roleLabels[role] ?? role}
          </Badge>
        </div>
      )}

      <DashboardNavLinks items={items} />

      <div className="mt-auto border-t border-border/60 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
