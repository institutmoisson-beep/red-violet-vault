import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SubmitInput = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  date_of_birth: z.string().min(4),
  phone: z.string().min(6).max(30),
  whatsapp: z.string().min(6).max(30),
  address: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(4).default("CI"),
  avatar_url: z.string().nullable().optional(),
  id_card_recto_url: z.string().min(1),
  id_card_verso_url: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SubmitInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Run AI fraud check (best-effort)
    let ai_fraud_score: number | null = null;
    let ai_fraud_notes: string | null = null;
    try {
      const { callAI } = await import("@/lib/ai.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Look for potential duplicates (same phone or GPS cluster)
      const { data: near } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, phone, latitude, longitude")
        .neq("id", userId)
        .or(`phone.eq.${data.phone},whatsapp.eq.${data.whatsapp}`)
        .limit(5);

      const prompt = `Analyse ce profil KYC pour risque de fraude (0=safe, 100=very risky). Contexte:
Profil: ${data.first_name} ${data.last_name}, tel ${data.phone}, whatsapp ${data.whatsapp}, GPS ${data.latitude},${data.longitude}, ville ${data.city ?? "?"}.
Doublons potentiels: ${JSON.stringify(near ?? [])}
Réponds en JSON: {"score": number, "notes": string en français court}.`;
      const raw = await callAI({
        system: "Tu es un agent anti-fraude KYC. Réponds toujours en JSON valide.",
        user: prompt,
        json: true,
      });
      const parsed = JSON.parse(raw) as { score?: number; notes?: string };
      if (typeof parsed.score === "number") ai_fraud_score = parsed.score;
      if (parsed.notes) ai_fraud_notes = parsed.notes;
    } catch (e) {
      console.warn("AI fraud check failed", e);
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        phone: data.phone,
        whatsapp: data.whatsapp,
        address: data.address,
        city: data.city,
        country: data.country,
        avatar_url: data.avatar_url ?? null,
        id_card_recto_url: data.id_card_recto_url,
        id_card_verso_url: data.id_card_verso_url,
        latitude: data.latitude,
        longitude: data.longitude,
        kyc_status: "PENDING_VERIFICATION",
        kyc_submitted_at: new Date().toISOString(),
        ai_fraud_score,
        ai_fraud_notes,
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true, ai_fraud_score, ai_fraud_notes };
  });

export const adminSetKycStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        status: z.enum(["VERIFIED", "REJECTED"]),
        reason: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    // Use the admin's own authenticated client (RLS-scoped), not the
    // service_role client: the "Admins can update any profile" policy
    // already allows this, and it removes the dependency on
    // SUPABASE_SERVICE_ROLE_KEY being configured correctly.
    const { data: updated, error } = await context.supabase
      .from("profiles")
      .update({
        kyc_status: data.status,
        kyc_verified_at: data.status === "VERIFIED" ? new Date().toISOString() : null,
        kyc_rejection_reason: data.status === "REJECTED" ? data.reason ?? null : null,
      })
      .eq("id", data.user_id)
      .select("id, kyc_status");
    if (error) throw new Error(error.message);
    if (!updated || updated.length === 0) {
      // update() succeeds with no error even when 0 rows match (wrong id,
      // or an RLS policy silently blocking the write). Surface this
      // instead of a false "success".
      throw new Error(
        `Aucun profil mis à jour pour l'utilisateur ${data.user_id}. Vérifiez que ce profil existe et que la policy "Admins can update any profile" est bien active sur la table profiles.`,
      );
    }
    return { ok: true };
  });
