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
    z
      .object({ campaign_id: z.string().uuid(), cycle_number: z.number().int().positive() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Même correctif que joinCampaign : passe par le client authentifié
    // + une fonction SECURITY DEFINER plutôt que supabaseAdmin, qui
    // provoquait un faux "Vous ne participez pas à cette tontine" pour
    // des utilisateurs bel et bien participants (lecture RLS bloquée
    // silencieusement).
    const { data: newBalance, error } = await (context.supabase.rpc as any)(
      "pay_tontine_installment",
      {
        p_campaign_id: data.campaign_id,
        p_cycle_number: data.cycle_number,
      },
    );
    if (error) throw new Error(error.message);
    return { ok: true, balance: newBalance };
  });

export const executeDraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaign_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await (context.supabase.rpc as any)("has_staff_role", {
      _user_id: context.userId,
      _role_key: "draws",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: campaign } = await context.supabase
      .from("tontine_campaigns")
      .select("*")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (!campaign) throw new Error("Campagne introuvable");
    if (campaign.status !== "ACTIVE") throw new Error("La campagne doit être ACTIVE");

    const nextCycle = campaign.current_cycle + 1;
    if (nextCycle > campaign.max_participants) throw new Error("Tous les cycles sont terminés");

    // Filet de sécurité : prélève automatiquement les cotisations dues
    // (portefeuille, avec création de dette si solde insuffisant) au cas
    // où le job planifié pg_cron n'aurait pas encore tourné.
    await (context.supabase.rpc as any)("charge_due_cycle_installments", {
      p_campaign_id: campaign.id,
    });

    // Eligible participants (not yet won)
    const { data: eligible } = await context.supabase
      .from("tontine_participants")
      .select("id, user_id, unique_draw_code")
      .eq("campaign_id", data.campaign_id)
      .eq("has_won", false);

    if (!eligible || eligible.length === 0) throw new Error("Aucun participant éligible");

    const winner = eligible[Math.floor(Math.random() * eligible.length)];

    const { data: winnerProfile } = await context.supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", winner.user_id)
      .maybeSingle();

    // Generate AI broadcast text (best-effort)
    let broadcast_text = `Félicitations à ${winnerProfile?.first_name ?? ""} ${winnerProfile?.last_name?.[0] ?? ""}. qui remporte "${campaign.title}" au cycle ${nextCycle} !`;
    try {
      const { callAI } = await import("@/lib/ai.server");
      const raw = await callAI({
        system:
          "Tu es le community manager MSN Tontine. Rédige en français, ton chaleureux, 2 phrases max, avec 1-2 emojis.",
        user: `Annonce du gagnant du cycle ${nextCycle}/${campaign.max_participants} pour la tontine "${campaign.title}". Gagnant: ${winnerProfile?.first_name} ${winnerProfile?.last_name?.[0]}. Code: ${winner.unique_draw_code}.`,
      });
      if (raw.trim()) broadcast_text = raw.trim();
    } catch (e) {
      console.warn("AI broadcast failed", e);
    }

    // Écritures atomiques (draw_events, participants, campagne,
    // delivery_orders) via la fonction SECURITY DEFINER — ne dépend
    // plus de supabaseAdmin.
    const { data: newCycle, error: rpcErr } = await (context.supabase.rpc as any)(
      "admin_execute_draw",
      {
        p_campaign_id: data.campaign_id,
        p_winner_user_id: winner.user_id,
        p_winner_draw_code: winner.unique_draw_code,
        p_winner_first_name: winnerProfile?.first_name ?? null,
        p_winner_last_name: winnerProfile?.last_name ?? null,
        p_winner_avatar_url: winnerProfile?.avatar_url ?? null,
        p_broadcast_text: broadcast_text,
      },
    );
    if (rpcErr) throw new Error(rpcErr.message);

    return {
      ok: true,
      cycle: newCycle ?? nextCycle,
      winner: winnerProfile,
      code: winner.unique_draw_code,
      broadcast_text,
    };
  });
