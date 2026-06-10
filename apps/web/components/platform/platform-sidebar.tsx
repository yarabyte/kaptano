import Image from "next/image";
import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlatformNavLinks } from "@/components/platform/platform-nav";
import type { PlatformNavItem } from "@/lib/platform-nav";

type PlatformSidebarProps = {
  items: PlatformNavItem[];
  userName: string;
  userEmail: string;
  signOut: () => Promise<void>;
};

export function PlatformSidebar({
  items,
  userName,
  userEmail,
  signOut,
}: PlatformSidebarProps) {
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-white md:flex md:w-72">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <Link href="/platform" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Kaptano" width={32} height={32} />
          <div>
            <span className="font-heading text-lg font-bold tracking-tight">Kaptano</span>
            <Badge variant="secondary" className="ml-0 mt-0.5 block w-fit text-[10px]">
              Admin
            </Badge>
          </div>
        </Link>
      </div>

      <div className="border-b border-border/40 bg-gradient-to-br from-primary/5 to-white px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Shield className="h-4 w-4 text-primary" />
          Plateforme
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Supervision des espaces exposants
        </p>
      </div>

      <PlatformNavLinks items={items} />

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
