import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatMoney } from "@/lib/i18n";
import { RequireAuth } from "@/components/app-shell";

export const Route = createFileRoute("/campaigns")({
  component: () => (
    <RequireAuth>
      <CampaignsPage />
    </RequireAuth>
  ),
});

type Category = { id: string; slug: string; name_fr: string; name_en: string; icon: string };
type Campaign = {
  id: string;
  title: string;
  description: string | null;
  total_price: number;
  installment_price: number;
  max_participants: number;
  current_participants_count: number;
  frequency_days: number;
  status: string;
  category_id: string | null;
};

function CampaignsPage() {
  const { t, lang, currency } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    supabase.from("tontine_categories").select("*").order("sort_order").then(({ data }) => setCategories(data ?? []));
    supabase
      .from("tontine_campaigns")
      .select("*")
      .in("status", ["OPEN", "ACTIVE"])
      .order("created_at", { ascending: false })
      .then(({ data }) => setCampaigns((data ?? []) as Campaign[]));
  }, []);

  const filtered = filter === "all" ? campaigns : campaigns.filter((c) => c.category_id === filter);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">MSN Tontine</div>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{t("campaigns_title")}</h1>

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
            filter === "all"
              ? "border-brand-red bg-gradient-brand text-primary-foreground shadow-brand"
              : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("campaigns_all")}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              filter === c.id
                ? "border-brand-red bg-gradient-brand text-primary-foreground shadow-brand"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="mr-1">{c.icon}</span>
            {lang === "fr" ? c.name_fr : c.name_en}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          {lang === "fr" ? "Aucune tontine dans cette catégorie pour le moment." : "No tontines in this category yet."}
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const pct = Math.round((c.current_participants_count / c.max_participants) * 100);
          return (
            <Link
              key={c.id}
              to="/campaigns/$id"
              params={{ id: c.id }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur transition-all hover:-translate-y-1 hover:border-brand-red/50 hover:shadow-brand"
            >
              <div className="aspect-video bg-gradient-brand-soft" />
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between">
                  <div className="font-display text-lg font-bold">{c.title}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      c.status === "OPEN" ? "bg-brand-violet/20 text-brand-violet" : "bg-brand-red/20 text-brand-red"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Valeur</div>
                    <div className="font-display text-base font-bold text-gradient-brand">
                      {formatMoney(Number(c.total_price), currency, lang)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cotisation / cycle</div>
                    <div className="font-display text-base font-bold">
                      {formatMoney(Number(c.installment_price), currency, lang)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {c.current_participants_count}/{c.max_participants} {t("participants")}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
