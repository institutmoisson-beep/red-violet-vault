import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function generateDrawCode(): string {
  const n = Math.floor(Math.random() * 900 + 100);
  return `MSN-TON-${n.toString().padStart(3, "0")}`;
}

export const joinCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaign_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ensure verified
    const { data: profile } = await supabase
      .from("profiles")
      .select("kyc_status")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || profile.kyc_status !== "VERIFIED") {
      throw new Error("Vérification KYC requise pour rejoindre une tontine");
    }

    // Campaign check
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("tontine_campaigns")
      .select("id, max_participants, current_participants_count, status, installment_price, frequency_days, draw_hour_utc, next_draw_at")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (cErr || !campaign) throw new Error("Campagne introuvable");
    if (campaign.status !== "OPEN") throw new Error("Cette tontine n'accepte plus de participants");
    if (campaign.current_participants_count >= campaign.max_participants)
      throw new Error("Cette tontine est complète");

    // Generate unique code
    let code = generateDrawCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from("tontine_participants")
        .select("id")
        .eq("campaign_id", data.campaign_id)
        .eq("unique_draw_code", code)
        .maybeSingle();
      if (!existing) break;
      code = generateDrawCode();
    }

    const { error } = await supabaseAdmin
      .from("tontine_participants")
      .insert({ campaign_id: data.campaign_id, user_id: userId, unique_draw_code: code });
    if (error) throw new Error(error.message);

    const newCount = campaign.current_participants_count + 1;
    const updates: Record<string, unknown> = { current_participants_count: newCount };
    if (newCount >= campaign.max_participants) {
      updates.status = "ACTIVE";
      const now = new Date();
      now.setUTCHours(campaign.draw_hour_utc, 0, 0, 0);
      if (now.getTime() < Date.now()) now.setUTCDate(now.getUTCDate() + campaign.frequency_days);
      updates.next_draw_at = now.toISOString();
    }
    await supabaseAdmin.from("tontine_campaigns").update(updates).eq("id", campaign.id);

    return { ok: true, unique_draw_code: code };
  });

export const executeDraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaign_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign } = await supabaseAdmin
      .from("tontine_campaigns")
      .select("*")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (!campaign) throw new Error("Campagne introuvable");
    if (campaign.status !== "ACTIVE") throw new Error("La campagne doit être ACTIVE");

    const nextCycle = campaign.current_cycle + 1;
    if (nextCycle > campaign.max_participants)
      throw new Error("Tous les cycles sont terminés");

    // Eligible participants (not yet won)
    const { data: eligible } = await supabaseAdmin
      .from("tontine_participants")
      .select("id, user_id, unique_draw_code")
      .eq("campaign_id", data.campaign_id)
      .eq("has_won", false);

    if (!eligible || eligible.length === 0) throw new Error("Aucun participant éligible");

    const winner = eligible[Math.floor(Math.random() * eligible.length)];

    const { data: winnerProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", winner.user_id)
      .maybeSingle();

    // Generate AI broadcast text (best-effort)
    let broadcast_text = `Félicitations à ${winnerProfile?.first_name ?? ""} ${winnerProfile?.last_name?.[0] ?? ""}. qui remporte "${campaign.title}" au cycle ${nextCycle} !`;
    try {
      const { callAI } = await import("@/lib/ai.server");
      const raw = await callAI({
        system: "Tu es le community manager MSN Tontine. Rédige en français, ton chaleureux, 2 phrases max, avec 1-2 emojis.",
        user: `Annonce du gagnant du cycle ${nextCycle}/${campaign.max_participants} pour la tontine "${campaign.title}". Gagnant: ${winnerProfile?.first_name} ${winnerProfile?.last_name?.[0]}. Code: ${winner.unique_draw_code}.`,
      });
      if (raw.trim()) broadcast_text = raw.trim();
    } catch (e) {
      console.warn("AI broadcast failed", e);
    }

    const { data: drawEvent, error: dErr } = await supabaseAdmin
      .from("draw_events")
      .insert({
        campaign_id: campaign.id,
        cycle_number: nextCycle,
        winner_user_id: winner.user_id,
        winner_draw_code: winner.unique_draw_code,
        winner_first_name: winnerProfile?.first_name,
        winner_last_name: winnerProfile?.last_name,
        winner_avatar_url: winnerProfile?.avatar_url,
        broadcast_text,
      })
      .select()
      .single();
    if (dErr) throw new Error(dErr.message);

    await supabaseAdmin
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

    await supabaseAdmin
      .from("tontine_campaigns")
      .update({
        current_cycle: nextCycle,
        next_draw_at: nextDrawAt,
        status: isFinal ? "COMPLETED" : "ACTIVE",
      })
      .eq("id", campaign.id);

    // Create delivery order
    await supabaseAdmin.from("delivery_orders").insert({
      draw_event_id: drawEvent.id,
      winner_user_id: winner.user_id,
      campaign_id: campaign.id,
    });

    return { ok: true, cycle: nextCycle, winner: winnerProfile, code: winner.unique_draw_code, broadcast_text };
  });
