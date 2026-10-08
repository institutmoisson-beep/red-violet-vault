import { createFileRoute } from "@tanstack/react-router";

// pg_cron scheduled tick:
//  - Auto-debits pending installments for ACTIVE campaigns from participant wallets
//  - Runs draws for ACTIVE campaigns whose next_draw_at is due
// Called by pg_cron with `apikey` header set to the Supabase publishable key.
export const Route = createFileRoute("/api/public/hooks/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apiKey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!expected || !apiKey || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();
        const results: Array<Record<string, unknown>> = [];

        // ---------- 1) Auto-debits (atomic, in database) ----------
        // Debits wallets for due cycles; any shortfall becomes debt, repaid
        // automatically on the next approved recharge.
        const { data: charges, error: chargeErr } = await (supabaseAdmin.rpc as any)(
          "charge_due_cycle_installments",
          { p_campaign_id: null },
        );
        if (chargeErr) results.push({ kind: "charge_error", error: chargeErr.message });
        for (const c of (charges ?? []) as Array<Record<string, unknown>>) {
          results.push({ kind: "charge", ...c });
        }

        // ---------- 2) Automatic draws ----------
        const { data: due } = await supabaseAdmin
          .from("tontine_campaigns")
          .select("id")
          .eq("status", "ACTIVE")
          .not("next_draw_at", "is", null)
          .lte("next_draw_at", nowIso);

        for (const d of due ?? []) {
          try {
            const drawResult = await runDraw(d.id, supabaseAdmin);
            results.push({ kind: "draw", campaign_id: d.id, ...drawResult });
          } catch (e) {
            results.push({ kind: "draw_error", campaign_id: d.id, error: (e as Error).message });
          }
        }

        return Response.json({ ok: true, at: nowIso, actions: results });
      },
    },
  },
});

type AdminClient = typeof import("@/integrations/supabase/client.server")["supabaseAdmin"];
async function runDraw(campaignId: string, sb: AdminClient) {
  const { data: campaign } = await sb
    .from("tontine_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign || campaign.status !== "ACTIVE") throw new Error("Campagne non active");
  const nextCycle = (campaign.current_cycle ?? 0) + 1;
  if (nextCycle > campaign.max_participants) throw new Error("Tous les cycles terminés");

  const { data: eligible } = await sb
    .from("tontine_participants")
    .select("id, user_id, unique_draw_code")
    .eq("campaign_id", campaignId)
    .eq("has_won", false);
  if (!eligible || eligible.length === 0) throw new Error("Aucun participant éligible");

  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  const { data: wp } = await sb
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", winner.user_id)
    .maybeSingle();

  let broadcast_text = `Félicitations à ${wp?.first_name ?? ""} ${wp?.last_name?.[0] ?? ""}. qui remporte "${campaign.title}" au cycle ${nextCycle} !`;
  try {
    const { callAI } = await import("@/lib/ai.server");
    const raw = await callAI({
      system: "Tu es le community manager MSN Tontine. Rédige en français, ton chaleureux, 2 phrases max, avec 1-2 emojis.",
      user: `Annonce du gagnant du cycle ${nextCycle}/${campaign.max_participants} pour la tontine "${campaign.title}". Gagnant: ${wp?.first_name} ${wp?.last_name?.[0]}. Code: ${winner.unique_draw_code}.`,
    });
    if (raw.trim()) broadcast_text = raw.trim();
  } catch (e) {
    console.warn("AI broadcast failed", e);
  }

  const { data: drawEvent, error: dErr } = await sb
    .from("draw_events")
    .insert({
      campaign_id: campaign.id,
      cycle_number: nextCycle,
      winner_user_id: winner.user_id,
      winner_draw_code: winner.unique_draw_code,
      winner_first_name: wp?.first_name,
      winner_last_name: wp?.last_name,
      winner_avatar_url: wp?.avatar_url,
      broadcast_text,
    })
    .select()
    .single();
  if (dErr) throw new Error(dErr.message);

  await sb
    .from("tontine_participants")
    .update({ has_won: true, draw_win_cycle_number: nextCycle })
    .eq("id", winner.id);

  const isFinal = nextCycle >= campaign.max_participants;
  const nextDrawAt = isFinal
    ? null
    : (() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + campaign.frequency_days);
        d.setUTCHours(campaign.draw_hour_utc, 0, 0, 0);
        return d.toISOString();
      })();
  await sb
    .from("tontine_campaigns")
    .update({
      current_cycle: nextCycle,
      next_draw_at: nextDrawAt,
      status: isFinal ? "COMPLETED" : "ACTIVE",
    })
    .eq("id", campaign.id);

  await sb.from("delivery_orders").insert({
    draw_event_id: drawEvent.id,
    winner_user_id: winner.user_id,
    campaign_id: campaign.id,
  });

  return { cycle: nextCycle, winner: wp, code: winner.unique_draw_code };
}
