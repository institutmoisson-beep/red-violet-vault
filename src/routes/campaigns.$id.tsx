import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-auth";
import { useI18n, formatMoney } from "@/lib/i18n";
import { RequireAuth } from "@/components/app-shell";
import { joinCampaign } from "@/lib/tontine.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/campaigns/$id")({
  component: () => (
    <RequireAuth>
      <CampaignDetail />
    </RequireAuth>
  ),
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

function CampaignDetail() {
  const { id } = Route.useParams();
  const { t, lang, currency } = useI18n();
  const { profile, user } = useProfile();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [joining, setJoining] = useState(false);
  const join = useServerFn(joinCampaign);

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
  }, [id]);

  if (!campaign) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Chargement…</div>
    );
  }

  const alreadyIn = participants.some((p) => p.user_id === user?.id);
  const canJoin =
    campaign.status === "OPEN" &&
    !alreadyIn &&
    profile?.kyc_status === "VERIFIED" &&
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/campaigns" className="text-xs text-muted-foreground hover:text-foreground">
        ← {t("campaigns_title")}
      </Link>
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
        {canJoin ? (
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
        ) : profile?.kyc_status !== "VERIFIED" ? (
          <Link to="/verify" className="rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-2 text-sm text-brand-red">
            {t("join_requires_verified")} →
          </Link>
        ) : (
          <div className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">Complet</div>
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
