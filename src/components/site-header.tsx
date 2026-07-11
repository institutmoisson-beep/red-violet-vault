import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground shadow-brand">
            M
          </span>
          <div className="leading-tight">
            <div className="font-display text-base font-bold tracking-tight text-foreground">
              MSN Tontine
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              L'Institut Moisson
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/campaigns" className="transition-colors hover:text-foreground">
            Tontines
          </Link>
          <a href="/#how" className="transition-colors hover:text-foreground">
            Comment ça marche
          </a>
          <a href="/#trust" className="transition-colors hover:text-foreground">
            Sécurité
          </a>
          <Link to="/wallet" className="transition-colors hover:text-foreground">
            Portefeuille
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:inline-flex"
          >
            Se connecter
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand transition-transform hover:scale-[1.02]"
          >
            Commencer
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
              M
            </span>
            <div className="font-display font-bold">MSN Tontine</div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Branche officielle de <span className="text-foreground">L'Institut Moisson</span>. La
            tontine e-commerce de nouvelle génération.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plateforme
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/campaigns" className="hover:text-foreground">Explorer les tontines</Link></li>
            <li><Link to="/wallet" className="hover:text-foreground">Portefeuille</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Tableau de bord</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Confiance
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="/#trust" className="hover:text-foreground">Vérification KYC</a></li>
            <li><a href="/#how" className="hover:text-foreground">Tirages transparents</a></li>
            <li><a href="/#" className="hover:text-foreground">Assistance</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>hello@msntontine.com</li>
            <li>Abidjan · Dakar · Lomé</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MSN Tontine · L'Institut Moisson. Tous droits réservés.
      </div>
    </footer>
  );
}
