import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
          {eyebrow}
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p>

        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-8 backdrop-blur">
          {children ?? (
            <div className="text-sm text-muted-foreground">
              Cette section est en cours de construction. Le backend (Lovable Cloud), le
              portefeuille intelligent et le moteur de tirage seront branchés dans les prochaines
              étapes.
            </div>
          )}
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center rounded-md border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-background"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
