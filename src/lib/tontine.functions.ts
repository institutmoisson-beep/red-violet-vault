   import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const joinCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaign_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Passe par une fonction RPC SECURITY DEFINER (join_tontine_campaign),
    // appelée avec le client authentifié normal de l'utilisateur
    // (context.supabase). On évite ainsi de dépendre de supabaseAdmin /
    // SUPABASE_SERVICE_ROLE_KEY, qui provoquait un rejet RLS silencieux ou
    // explicite si cette clé est mal configurée dans l'environnement de
    // déploiement. Toute la logique (vérif statut/complet/doublon,
    // génération du code, insertion, mise à jour du compteur) est faite
    // atomiquement côté base, avec verrou anti-course sur la campagne.
    const { data: code, error } = await context.supabase.rpc("join_tontine_campaign", {
      p_campaign_id: data.campaign_id,
    });
    if (error) throw new Error(error.message);
    if (!code) throw new Error("Erreur inattendue lors de l'inscription à la tontine");

    return { ok: true, unique_draw_code: code };
  });

export const payInstallment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ campaign_id: z.string().uuid(), cycle_number: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign } = await supabaseAdmin
      .from("tontine_campaigns")
      .select("id, title, installment_price, max_participants")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (!campaign) throw new Error("Campagne introuvable");
    if (data.cycle_number > campaign.max_participants) throw new Error("Cycle invalide");

    // Must be a participant
    const { data: participant } = await supabaseAdmin
      .from("tontine_participants")
      .select("id")
      .eq("campaign_id", data.campaign_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!participant) throw new Error("Vous ne participez pas à cette tontine");

    // Not already paid
    const { data: existing } = await supabaseAdmin
      .from("tontine_payments_ledger")
      .select("id, status")
      .eq("campaign_id", data.campaign_id)
      .eq("user_id", userId)
      .eq("cycle_number", data.cycle_number)
      .maybeSingle();
    if (existing?.status === "APPROVED") throw new Error("Cotisation déjà payée");

    const amt = Number(campaign.installment_price);
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    const bal = Number(wallet?.balance ?? 0);
    if (bal < amt) throw new Error("Solde insuffisant — rechargez votre portefeuille");
    const newBal = bal - amt;
    await supabaseAdmin.from("wallets").update({ balance: newBal, updated_at: new Date().toISOString() }).eq("user_id", userId);
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      type: "DEBIT",
      amount: amt,
      balance_after: newBal,
      note: `Cotisation — ${campaign.title} · Cycle ${data.cycle_number}`,
    });
    const nowIso = new Date().toISOString();
    if (existing) {
      await supabaseAdmin
        .from("tontine_payments_ledger")
        .update({ status: "APPROVED", payment_timestamp: nowIso, note: "Paiement manuel" })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("tontine_payments_ledger").insert({
        campaign_id: data.campaign_id,
        user_id: userId,
        cycle_number: data.cycle_number,
        amount: amt,
        status: "APPROVED",
        payment_timestamp: nowIso,
        note: "Paiement manuel",
      });
    }
    return { ok: true, balance: newBal };
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
