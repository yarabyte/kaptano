import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const sectionLinks = [
  { href: "/#cas-usage", label: "Cas d'usage" },
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#processus", label: "Comment ça marche" },
  { href: "/pricing", label: "Tarifs" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-white/90 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:h-[4.5rem]">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Kaptano"
            width={36}
            height={36}
            priority
          />
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            Kaptano
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary md:inline lg:px-3"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-medium">
              Connexion
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="shadow-md shadow-primary/25">
              Essai gratuit
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
