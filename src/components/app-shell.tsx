import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n, type Lang, type Currency } from "@/lib/i18n";
import { signOut, useProfile } from "@/hooks/use-auth";

export function LanguageCurrencyPicker() {
  const { lang, setLang, currency, setCurrency } = useI18n();
  return (
    <div className="flex items-center gap-1 text-xs">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
        aria-label="Language"
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
        aria-label="Currency"
      >
        <option value="XOF">F CFA</option>
        <option value="EUR">EUR</option>
        <option value="USD">USD</option>
        <option value="USDT">USDT</option>
      </select>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { profile, isAdmin, user } = useProfile();
  const navigate = useNavigate();

  const initials = ((profile?.first_name?.[0] ?? user?.email?.[0]) || "?").toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground shadow-brand">
              M
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="font-display text-base font-bold tracking-tight">MSN Tontine</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                L'Institut Moisson
              </div>
            </div>
          </Link>

          <nav className="flex flex-1 items-center gap-3 overflow-x-auto text-xs font-medium text-muted-foreground sm:gap-6 sm:text-sm">
            <Link to="/dashboard" className="whitespace-nowrap hover:text-foreground">
              {t("nav_dashboard")}
            </Link>
            <Link
              to="/campaigns"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-brand px-3 py-1 font-semibold text-primary-foreground shadow-brand"
            >
              🎯 {t("nav_tontines")}
            </Link>
            <Link to="/wallet" className="whitespace-nowrap hover:text-foreground">
              {t("nav_wallet")}
            </Link>
            {isAdmin && (
              <Link to="/admin" className="whitespace-nowrap text-brand-red hover:text-foreground">
                {t("nav_admin")}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageCurrencyPicker />
            {profile?.kyc_status === "VERIFIED" ? (
              <span className="hidden rounded-full bg-brand-violet/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-violet sm:inline">
                ✓ KYC
              </span>
            ) : profile?.kyc_status === "PENDING_VERIFICATION" ? (
              <Link
                to="/verify"
                className="hidden rounded-full border border-brand-red/40 bg-brand-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-red sm:inline"
              >
                KYC
              </Link>
            ) : null}
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
              {initials}
            </div>
            <button
              onClick={() => signOut().then(() => navigate({ to: "/" }))}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {t("nav_signout")}
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}

