"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sectionLinks = [
  { href: "/#cas-usage", label: "Cas d'usage" },
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#processus", label: "Comment ça marche" },
  { href: "/pricing", label: "Tarifs" },
];

type MarketingHeaderProps = {
  isAuthenticated: boolean;
  dashboardHref: string;
  signOut: () => Promise<void>;
};

function AuthButtons({
  isAuthenticated,
  dashboardHref,
  signOut,
  className,
  onNavigate,
}: MarketingHeaderProps & { className?: string; onNavigate?: () => void }) {
  if (isAuthenticated) {
    return (
      <div className={cn("flex items-center gap-1 sm:gap-2", className)}>
        <Link href={dashboardHref} onClick={onNavigate}>
          <Button size="sm" className="shadow-md shadow-primary/25">
            Dashboard
          </Button>
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="font-medium">
            Déconnexion
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2", className)}>
      <Link href="/login" onClick={onNavigate}>
        <Button variant="ghost" size="sm" className="font-medium">
          Connexion
        </Button>
      </Link>
      <Link href="/signup" onClick={onNavigate}>
        <Button size="sm" className="shadow-md shadow-primary/25">
          Essai gratuit
        </Button>
      </Link>
    </div>
  );
}

export function MarketingHeader({
  isAuthenticated,
  dashboardHref,
  signOut,
}: MarketingHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-white/90 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:h-[4.5rem]">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/logo.png" alt="Kaptano" width={36} height={36} priority />
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            Kaptano
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex lg:gap-1">
          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary lg:px-3"
            >
              {link.label}
            </Link>
          ))}
          <AuthButtons
            isAuthenticated={isAuthenticated}
            dashboardHref={dashboardHref}
            signOut={signOut}
          />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {!isAuthenticated && (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium">
                Connexion
              </Button>
            </Link>
          )}
          {isAuthenticated && (
            <Link href={dashboardHref}>
              <Button size="sm" className="shadow-md shadow-primary/25">
                Dashboard
              </Button>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border/40 bg-white md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="container mx-auto flex flex-col gap-1 px-4 py-3">
          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2" onClick={() => setOpen(false)}>
            <AuthButtons
              isAuthenticated={isAuthenticated}
              dashboardHref={dashboardHref}
              signOut={signOut}
              className="w-full flex-col gap-2 [&_a]:w-full [&_button]:w-full [&_form]:w-full"
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
