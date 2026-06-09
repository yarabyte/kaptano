"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Building2,
  MessageCircle,
  CreditCard,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformNavIcon, PlatformNavItem } from "@/lib/platform-nav";

const iconMap: Record<PlatformNavIcon, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  building: Building2,
  "message-circle": MessageCircle,
  "credit-card": CreditCard,
  "alert-triangle": AlertTriangle,
};

export function PlatformNavLinks({
  items,
  onNavigate,
}: {
  items: PlatformNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {items.map(({ href, label, icon }) => {
        const Icon = iconMap[icon];
        const active =
          href === "/platform"
            ? pathname === "/platform"
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

export function PlatformMobileNav({ items }: { items: PlatformNavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/60 bg-white/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="font-heading text-sm font-semibold text-foreground">Admin plateforme</span>
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
          <PlatformNavLinks items={items} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
