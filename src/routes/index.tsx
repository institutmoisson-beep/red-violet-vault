import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  component: Landing,
});

const categories = [
  { name: "Alimentaire", icon: "🍚", tone: "from-brand-red/25 to-brand-violet/10" },
  { name: "Vivrier", icon: "🌾", tone: "from-brand-gold/25 to-brand-red/10" },
  { name: "Électroménager", icon: "🧊", tone: "from-brand-violet/25 to-brand-red/10" },
  { name: "Électrotechnique", icon: "🔌", tone: "from-brand-red/25 to-brand-gold/10" },
  { name: "Machines & Outils", icon: "🛠️", tone: "from-brand-violet/25 to-brand-gold/10" },
  { name: "Moto & Voiture", icon: "🏍️", tone: "from-brand-red/30 to-brand-violet/20" },
  { name: "Divertissement", icon: "🎧", tone: "from-brand-violet/25 to-brand-red/10" },
];

const cycle = [
  { n: "01", t: "Rejoignez une tontine", d: "Parcourez les produits et rejoignez un groupe (ex. 6 participants pour une moto)." },
  { n: "02", t: "Cotisez depuis votre wallet", d: "Vos versements sont prélevés automatiquement selon la fréquence choisie." },
  { n: "03", t: "Recevez votre code de tirage", d: "Un code unique MSN-TON-XXX vous est attribué à chaque cycle." },
  { n: "04", t: "Tirage au sort en direct", d: "À l'heure prévue, un tirage aléatoire équitable désigne le gagnant du cycle." },
  { n: "05", t: "Livraison sous 48h", d: "Le gagnant confirme son adresse — le compte à rebours démarre." },
  { n: "06", t: "Le cycle continue", d: "Tous les participants continuent de cotiser jusqu'à ce que chacun reçoive son produit." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-brand-red/25 blur-[140px]" />
          <div className="absolute right-0 top-40 h-[400px] w-[500px] rounded-full bg-brand-violet/25 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-red" />
              Branche officielle · L'Institut Moisson
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
              La tontine, <span className="text-gradient-brand">réinventée</span> pour l'ère numérique.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Cotisez ensemble, tirez au sort en direct, et repartez chacun avec le produit
              convoité — moto, électroménager, machines, alimentation. Transparent, sécurisé,
              propulsé par une IA anti-fraude.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition-transform hover:scale-[1.02]"
              >
                Créer mon compte vérifié
              </Link>
              <Link
                to="/campaigns"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card/70 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur hover:bg-card"
              >
                Explorer les tontines →
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur sm:gap-10">
              {[
                { k: "100%", v: "Participants gagnants" },
                { k: "48h", v: "Livraison garantie" },
                { k: "KYC", v: "Vérification obligatoire" },
              ].map((s) => (
                <div key={s.v} className="text-left">
                  <div className="font-display text-2xl font-bold text-gradient-brand sm:text-3xl">
                    {s.k}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
              Catégories
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Choisissez votre univers
            </h2>
          </div>
          <Link to="/campaigns" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">
            Voir tout →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {categories.map((c) => (
            <Link
              key={c.name}
              to="/campaigns"
              className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${c.tone} p-5 transition-all hover:-translate-y-1 hover:border-brand-red/50`}
            >
              <div className="text-3xl">{c.icon}</div>
              <div className="mt-6 text-sm font-semibold text-foreground">{c.name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                Explorer
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
            Le cycle MSN
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Six étapes. Un seul objectif : que chacun gagne.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Un modèle inspiré de la tontine africaine, orchestré par un moteur de tirage
            automatisé et un portefeuille intelligent.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cycle.map((step) => (
            <div
              key={step.n}
              className="group relative rounded-2xl border border-border bg-card/60 p-6 backdrop-blur transition-all hover:border-brand-red/50 hover:shadow-brand"
            >
              <div className="font-display text-5xl font-bold text-gradient-brand opacity-80">
                {step.n}
              </div>
              <div className="mt-4 font-display text-lg font-semibold">{step.t}</div>
              <div className="mt-2 text-sm text-muted-foreground">{step.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="relative py-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-brand-violet/10 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-violet">
                Confiance & sécurité
              </div>
              <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                Une plateforme <span className="text-gradient-brand">anti-fraude</span> par conception.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Vérification d'identité complète, géolocalisation en direct lors de l'inscription,
                détection IA des comptes multiples, et un registre public des tirages. Chaque cycle
                est traçable, chaque gagnant vérifiable.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Pièce d'identité recto/verso vérifiée manuellement",
                  "GPS capturé au moment de l'inscription",
                  "Tirages aléatoires exécutés côté serveur, en direct",
                  "Historique public des gagnants par cycle",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-gradient-brand text-[10px] font-bold text-primary-foreground">
                      ✓
                    </span>
                    <span className="text-foreground/90">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative rounded-3xl border border-border bg-card/70 p-6 backdrop-blur">
              <div className="absolute -inset-px -z-10 rounded-3xl bg-gradient-brand opacity-20 blur-2xl" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Prochain tirage · en direct
                  </div>
                  <div className="mt-1 font-display text-xl font-bold">Moto Yamaha Crux</div>
                </div>
                <div className="rounded-full border border-brand-red/40 bg-brand-red/10 px-3 py-1 text-xs font-semibold text-brand-red">
                  Cycle 3 / 6
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-2 text-center">
                {["18", "42", "07", "12"].map((v, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background/60 py-3">
                    <div className="font-display text-2xl font-bold">{v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {["h", "min", "s", "ms"][i]}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                {[
                  { c: "MSN-TON-091", n: "Awa K.", w: false },
                  { c: "MSN-TON-114", n: "Ibrahim S.", w: true, cy: "Cycle 1" },
                  { c: "MSN-TON-207", n: "Mariam D.", w: true, cy: "Cycle 2" },
                  { c: "MSN-TON-223", n: "Kouassi B.", w: false },
                ].map((p) => (
                  <div
                    key={p.c}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-xs font-bold">
                        {p.n[0]}
                      </div>
                      <div>
                        <div className="font-medium">{p.n}</div>
                        <div className="text-[11px] text-muted-foreground">{p.c}</div>
                      </div>
                    </div>
                    {p.w ? (
                      <span className="rounded-full bg-brand-violet/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-violet">
                        Gagné · {p.cy}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">En lice</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-brand p-10 text-center shadow-brand sm:p-14">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_80%,white,transparent_40%)]" />
          <h2 className="relative font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            Prêt à rejoindre votre première tontine ?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Inscrivez-vous, validez votre identité, alimentez votre portefeuille — et laissez le
            cycle MSN faire le reste.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-lg bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-background/90"
            >
              Commencer maintenant
            </Link>
            <Link
              to="/campaigns"
              className="inline-flex items-center rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-white/10"
            >
              Voir les tontines ouvertes
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
