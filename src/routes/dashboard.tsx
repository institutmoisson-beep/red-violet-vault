import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-auth";
import { useI18n, formatMoney } from "@/lib/i18n";
import { RequireAuth } from "@/components/app-shell";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const { t, lang, currency } = useI18n();
  const { profile, user } = useProfile();
  const [balance, setBalance] = useState(0);
  const [myParticipations, setMyParticipations] = useState<Array<{
    id: string;
    campaign_id: string;
    unique_draw_code: string;
    has_won: boolean;
    campaign: { title: string; status: string; current_cycle: number; max_participants: number; next_draw_at: string | null };
  }>>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setBalance(Number(data?.balance ?? 0));
    });
    supabase
      .from("tontine_participants")
      .select("id, campaign_id, unique_draw_code, has_won, campaign:tontine_campaigns(title, status, current_cycle, max_participants, next_draw_at)")
      .eq("user_id", user.id)
      .then(({ data }) => setMyParticipations((data ?? []) as never));
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
        {t("nav_dashboard")}
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        {lang === "fr" ? "Bonjour" : "Hello"}, {profile?.first_name ?? user?.email}
      </h1>

      {profile?.kyc_status !== "VERIFIED" && (
        <div className="mt-6 rounded-2xl border border-brand-red/40 bg-brand-red/10 p-5">
          <div className="text-sm font-semibold">
            {profile?.kyc_status === "REJECTED" ? t("kyc_rejected") : t("kyc_pending")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "fr"
              ? "Complétez votre vérification pour rejoindre une tontine."
              : "Complete verification to join a tontine."}
          </p>
          <Link
            to="/verify"
            className="mt-3 inline-flex rounded-md bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {t("kyc_submit")} →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-gradient-brand-soft p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("wallet_balance")}</div>
          <div className="mt-2 font-display text-3xl font-bold text-gradient-brand">
            {formatMoney(balance, currency, lang)}
          </div>
          <Link to="/wallet" className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground">
            Gérer →
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Tontines actives</div>
          <div className="mt-2 font-display text-3xl font-bold">
            {myParticipations.filter((x) => x.campaign?.status === "ACTIVE" || x.campaign?.status === "OPEN").length}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Produits gagnés</div>
          <div className="mt-2 font-display text-3xl font-bold text-gradient-brand">
            {myParticipations.filter((x) => x.has_won).length}
          </div>
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold">Mes tontines</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {myParticipations.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
            {lang === "fr" ? "Vous n'avez encore rejoint aucune tontine." : "You haven't joined any tontine yet."}{" "}
            <Link to="/campaigns" className="text-brand-red">
              Explorer →
            </Link>
          </div>
        )}
        {myParticipations.map((p) => (
          <Link
            key={p.id}
            to="/campaigns/$id"
            params={{ id: p.campaign_id }}
            className="flex items-start justify-between rounded-xl border border-border bg-card/60 p-4 hover:border-brand-red/40"
          >
            <div>
              <div className="font-display font-bold">{p.campaign?.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Code : <span className="font-mono">{p.unique_draw_code}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Cycle {p.campaign?.current_cycle}/{p.campaign?.max_participants}
              </div>
            </div>
            {p.has_won ? (
              <span className="rounded-full bg-brand-violet/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-violet">
                🏆 Gagné
              </span>
            ) : (
              <span className="rounded-full bg-brand-red/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-red">
                En lice
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
