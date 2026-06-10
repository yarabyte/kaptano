import Image from "next/image";
import Link from "next/link";

const links = {
  produit: [
    { href: "/pricing", label: "Tarifs" },
    { href: "/signup", label: "Inscription" },
    { href: "/login", label: "Connexion" },
  ],
  legal: [
    { href: "/cgu", label: "Conditions d'utilisation" },
    { href: "/cgv", label: "Conditions de vente" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t bg-accent/20">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Kaptano" width={36} height={36} />
              <span className="font-heading text-lg font-bold">Kaptano</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              La plateforme qui transforme vos visiteurs de salons professionnels,
              foires et expositions en leads qualifiés — capture offline,
              relance WhatsApp pilotée et suivi en temps réel.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Produit</p>
            <ul className="mt-4 space-y-3">
              {links.produit.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Légal</p>
            <ul className="mt-4 space-y-3">
              {links.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Contact</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Support exposants et intégrateurs WhatsApp.
            </p>
            <p className="mt-2 text-sm font-medium text-primary">hello@kaptano.app</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Kaptano. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/cgu" className="hover:text-primary">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-primary">
              CGV
            </Link>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>Salons professionnels, foires et expositions</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
