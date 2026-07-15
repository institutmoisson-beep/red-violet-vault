import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-auth";
import { useI18n, formatMoney } from "@/lib/i18n";
import { joinCampaign, payInstallment } from "@/lib/tontine.functions";
import { useServerFn } from "@tanstack/react-start";
import { signedUrl } from "@/lib/storage";

export const Route = createFileRoute("/campaigns/$id")({
  component: CampaignDetail,
});

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  total_price: number;
  installment_price: number;
  max_participants: number;
  current_participants_count: number;
  frequency_days: number;
  draw_hour_utc: number;
  next_draw_at: string | null;
  current_cycle: number;
  status: string;
  images: string[] | null;
};
type Participant = {
  id: string;
  user_id: string;
  unique_draw_code: string;
  has_won: boolean;
  draw_win_cycle_number: number | null;
  profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null };
};
type Draw = {
  id: string;
  cycle_number: number;
  winner_first_name: string | null;
  winner_last_name: string | null;
  winner_draw_code: string;
  executed_at: string;
  broadcast_text: string | null;
};

type LedgerEntry = { id: string; cycle_number: number; amount: number; status: string; note: string | null };

function CampaignDetail() {
  const { id } = Route.useParams();
  const { t, lang, currency } = useI18n();
  const { user } = useProfile();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [walletBal, setWalletBal] = useState<number>(0);
  const [joining, setJoining] = useState(false);
  const [payingCycle, setPayingCycle] = useState<number | null>(null);
  const join = useServerFn(joinCampaign);
  const pay = useServerFn(payInstallment);

  async function load() {
    const [{ data: c }, { data: p }, { data: d }] = await Promise.all([
      supabase.from("tontine_campaigns").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("tontine_participants")
        .select("id, user_id, unique_draw_code, has_won, draw_win_cycle_number")
        .eq("campaign_id", id),
      supabase.from("draw_events").select("*").eq("campaign_id", id).order("cycle_number"),
    ]);
    setCampaign(c as Campaign | null);
    if (c) setCover(await signedUrl("campaign-images", ((c as unknown as Campaign).images?.[0]) ?? null));
    setDraws((d ?? []) as Draw[]);
    if (p && p.length) {
      const ids = p.map((x) => x.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", ids);
      const map = new Map((profs ?? []).map((x) => [x.id, x]));
      setParticipants(
        p.map((x) => ({
          ...x,
          profile: map.get(x.user_id) as Participant["profile"],
        })) as Participant[],
      );
    } else {
      setParticipants([]);
    }
    if (user?.id) {
      const [{ data: lg }, { data: w }] = await Promise.all([
        supabase
          .from("tontine_payments_ledger")
          .select("id, cycle_number, amount, status, note")
          .eq("campaign_id", id)
          .eq("user_id", user.id)
          .order("cycle_number"),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setLedger((lg ?? []) as LedgerEntry[]);
      setWalletBal(Number(w?.balance ?? 0));
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`campaign-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tontine_campaigns", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tontine_participants", filter: `campaign_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "draw_events", filter: `campaign_id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  if (!campaign) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Chargement…</div>
    );
  }

  const alreadyIn = participants.some((p) => p.user_id === user?.id);
  const canJoin =
    Boolean(user?.id) &&
    campaign.status === "OPEN" &&
    !alreadyIn &&
    campaign.current_participants_count < campaign.max_participants;

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await join({ data: { campaign_id: id } });
      toast.success(`Vous participez ! Code : ${res.unique_draw_code}`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setJoining(false);
    }
  }

  async function handlePay(cycle: number) {
    setPayingCycle(cycle);
    try {
      await pay({ data: { campaign_id: id, cycle_number: cycle } });
      toast.success(`Cotisation cycle ${cycle} payée`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPayingCycle(null);
    }
  }

  const nextCycleToPay = campaign.current_cycle + 1;
  const paidCycles = new Set(ledger.filter((l) => l.status === "APPROVED").map((l) => l.cycle_number));
  const upcomingCycles: number[] = alreadyIn
    ? Array.from({ length: Math.max(0, campaign.max_participants - campaign.current_cycle) }, (_, i) => nextCycleToPay + i).filter(
        (n) => n <= campaign.max_participants && !paidCycles.has(n),
      )
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/campaigns" className="text-xs text-muted-foreground hover:text-foreground">
        ← {t("campaigns_title")}
      </Link>
      {cover && (
        <img src={cover} alt={campaign.title} className="mt-4 aspect-[16/6] w-full rounded-2xl object-cover" />
      )}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{campaign.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{campaign.description}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            campaign.status === "OPEN"
              ? "bg-brand-violet/20 text-brand-violet"
              : campaign.status === "ACTIVE"
                ? "bg-brand-red/20 text-brand-red"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {campaign.status} · {t("cycle")} {campaign.current_cycle}/{campaign.max_participants}
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Valeur totale" value={formatMoney(Number(campaign.total_price), currency, lang)} />
        <Stat label="Cotisation" value={formatMoney(Number(campaign.installment_price), currency, lang)} />
        <Stat label={t("participants")} value={`${campaign.current_participants_count}/${campaign.max_participants}`} />
        <Stat
          label={t("next_draw")}
          value={campaign.next_draw_at ? new Date(campaign.next_draw_at).toLocaleString() : "—"}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {!user ? (
          <Link
            to="/auth"
            className="rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand"
          >
            Se connecter pour participer
          </Link>
        ) : canJoin ? (
          <button
            disabled={joining}
            onClick={handleJoin}
            className="rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
          >
            {joining ? "…" : t("join_tontine")}
          </button>
        ) : alreadyIn ? (
          <div className="rounded-lg border border-brand-violet/40 bg-brand-violet/10 px-4 py-2 text-sm">
            ✓ Vous participez à cette tontine
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">Complet</div>
        )}
        {user && campaign.status === "ACTIVE" && (
          <Link
            to="/wallet"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted"
          >
            💳 Recharger — solde {formatMoney(walletBal, currency, lang)}
          </Link>
        )}
        {campaign.status === "ACTIVE" && (
          <Link
            to="/draw-live/$id"
            params={{ id }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted"
          >
            🔴 Suivre le tirage en direct
          </Link>
        )}
      </div>

      {alreadyIn && (
        <div className="mt-8 rounded-2xl border border-brand-red/30 bg-brand-red/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-red">Mes cotisations</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Cotisation : <b>{formatMoney(Number(campaign.installment_price), currency, lang)}</b> · Solde portefeuille : <b>{formatMoney(walletBal, currency, lang)}</b>
              </div>
            </div>
            <Link to="/wallet" className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">
              Recharger
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {ledger.filter((l) => l.status === "APPROVED").map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm">
                <div>
                  <div className="font-medium">Cycle {l.cycle_number} · {formatMoney(Number(l.amount), currency, lang)}</div>
                  {l.note && <div className="text-xs text-muted-foreground">{l.note}</div>}
                </div>
                <span className="rounded-full bg-brand-violet/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-violet">
                  ✓ Payé
                </span>
              </li>
            ))}
            {upcomingCycles.slice(0, 6).map((cyc) => (
              <li key={`u-${cyc}`} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm">
                <div>
                  <div className="font-medium">Cycle {cyc} · {formatMoney(Number(campaign.installment_price), currency, lang)}</div>
                  <div className="text-xs text-muted-foreground">En attente — payez maintenant ou sera prélevé automatiquement au tirage</div>
                </div>
                <button
                  disabled={payingCycle === cyc || walletBal < Number(campaign.installment_price)}
                  onClick={() => handlePay(cyc)}
                  className="rounded-md bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
                >
                  {payingCycle === cyc ? "…" : walletBal < Number(campaign.installment_price) ? "Solde insuffisant" : "Payer"}
                </button>
              </li>
            ))}
            {ledger.length === 0 && upcomingCycles.length === 0 && (
              <li className="text-sm text-muted-foreground">Aucune cotisation à afficher</li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("participants")}
          </div>
          <ul className="mt-4 space-y-2">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                    {(p.profile?.first_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">
                      {p.profile?.first_name} {p.profile?.last_name?.[0]}.
                    </div>
                    <div className="text-xs text-muted-foreground">{p.unique_draw_code}</div>
                  </div>
                </div>
                {p.has_won ? (
                  <span className="rounded-full bg-brand-violet/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-violet">
                    ✓ Cycle {p.draw_win_cycle_number}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">En lice</span>
                )}
              </li>
            ))}
            {participants.length === 0 && <li className="text-sm text-muted-foreground">Aucun participant</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("draw_history")}
          </div>
          <ul className="mt-4 space-y-3">
            {draws.map((d) => (
              <li key={d.id} className="rounded-lg border border-brand-violet/30 bg-brand-violet/5 p-3 text-sm">
                <div className="flex justify-between">
                  <div className="font-bold">
                    {t("cycle")} {d.cycle_number}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(d.executed_at).toLocaleString()}</div>
                </div>
                <div className="mt-1">
                  🏆 {d.winner_first_name} {d.winner_last_name?.[0]}. · <span className="font-mono">{d.winner_draw_code}</span>
                </div>
                {d.broadcast_text && <div className="mt-2 text-xs italic text-muted-foreground">{d.broadcast_text}</div>}
              </li>
            ))}
            {draws.length === 0 && <li className="text-sm text-muted-foreground">Aucun tirage encore</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
    </div>
  );
}
