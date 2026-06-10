"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  QrCode,
  FileText,
  MessageCircle,
  Inbox,
  CreditCard,
  UserPlus,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DashboardNavIcon } from "@/lib/dashboard-nav";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: DashboardNavIcon;
};

const iconMap: Record<DashboardNavIcon, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "user-plus": UserPlus,
  calendar: Calendar,
  "qr-code": QrCode,
  "file-text": FileText,
  "message-circle": MessageCircle,
  inbox: Inbox,
  "credit-card": CreditCard,
};

export function DashboardNavLinks({
  items,
  onNavigate,
}: {
  items: DashboardNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {items.map(({ href, label, icon }) => {
        const Icon = iconMap[icon];
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active && "opacity-90")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardMobileNav({ items }: { items: DashboardNavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/60 bg-white/95 backdrop-blur-sm md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="font-heading text-sm font-semibold text-foreground">Menu</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-white px-2 pb-3">
          <DashboardNavLinks items={items} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
