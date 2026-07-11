import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/app-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/draw-live/$id")({
  component: () => (
    <RequireAuth>
      <LiveDraw />
    </RequireAuth>
  ),
});

type Draw = {
  cycle_number: number;
  winner_first_name: string | null;
  winner_last_name: string | null;
  winner_draw_code: string;
  winner_avatar_url: string | null;
  broadcast_text: string | null;
  executed_at: string;
};
type Campaign = { title: string; current_cycle: number; max_participants: number; next_draw_at: string | null };

function LiveDraw() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [latest, setLatest] = useState<Draw | null>(null);
  const [reveal, setReveal] = useState(false);

  async function loadCampaign() {
    const { data } = await supabase
      .from("tontine_campaigns")
      .select("title, current_cycle, max_participants, next_draw_at")
      .eq("id", id)
      .maybeSingle();
    setCampaign(data as Campaign | null);
  }
  async function loadLatest() {
    const { data } = await supabase
      .from("draw_events")
      .select("*")
      .eq("campaign_id", id)
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLatest(data as Draw);
      setReveal(true);
      setTimeout(() => setReveal(false), 8000);
    }
  }

  useEffect(() => {
    loadCampaign();
    loadLatest();
    const channel = supabase
      .channel(`live-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "draw_events", filter: `campaign_id=eq.${id}` },
        (payload) => {
          setLatest(payload.new as Draw);
          setReveal(true);
          setTimeout(() => setReveal(false), 12000);
          loadCampaign();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-radial-glow opacity-70" />

      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Link to="/campaigns/$id" params={{ id }} className="text-xs text-muted-foreground hover:text-foreground">
          ← {campaign?.title}
        </Link>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-red/40 bg-brand-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-red">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-red" />
          {t("live_draw_title")}
        </div>

        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{campaign?.title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">
          Cycle {campaign?.current_cycle}/{campaign?.max_participants}
          {campaign?.next_draw_at && ` · Prochain : ${new Date(campaign.next_draw_at).toLocaleString()}`}
        </div>

        {reveal && latest ? (
          <div className="mt-14 animate-in fade-in zoom-in duration-700">
            <div className="mx-auto max-w-md rounded-3xl border border-brand-red/50 bg-gradient-brand p-10 text-center shadow-brand">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground/80">
                {t("live_draw_congrats")}
              </div>
              <div className="mx-auto mt-6 grid h-24 w-24 place-items-center rounded-full border-4 border-primary-foreground/60 bg-background text-3xl font-bold">
                {(latest.winner_first_name?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="mt-6 font-display text-3xl font-bold text-primary-foreground">
                {latest.winner_first_name} {latest.winner_last_name?.[0]}.
              </div>
              <div className="mt-2 font-mono text-lg text-primary-foreground/90">{latest.winner_draw_code}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-primary-foreground/70">
                Cycle {latest.cycle_number}
              </div>
              {latest.broadcast_text && (
                <div className="mt-5 rounded-xl bg-background/20 p-4 text-sm text-primary-foreground/95">
                  {latest.broadcast_text}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-14 rounded-3xl border border-border bg-card/60 p-12 backdrop-blur">
            <div className="font-display text-lg font-semibold text-muted-foreground">
              {latest ? `Dernier gagnant : ${latest.winner_first_name} (${latest.winner_draw_code})` : t("live_draw_waiting")}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Restez sur cette page — le tirage sera révélé en direct.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
