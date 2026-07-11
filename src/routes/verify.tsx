import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { RequireAuth } from "@/components/app-shell";
import { uploadFile } from "@/lib/storage";
import { submitKyc } from "@/lib/kyc.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/verify")({
  component: () => (
    <RequireAuth>
      <VerifyPage />
    </RequireAuth>
  ),
});

function VerifyPage() {
  const { t } = useI18n();
  const { profile, user } = useProfile();
  const navigate = useNavigate();
  const submit = useServerFn(submitKyc);

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [rectoFile, setRectoFile] = useState<File | null>(null);
  const [versoFile, setVersoFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
    }
  }, [profile?.id]);

  const status = profile?.kyc_status;

  if (status === "VERIFIED") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="inline-block rounded-full bg-brand-violet/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-violet">
          {t("kyc_verified")}
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">Votre compte est vérifié</h1>
        <p className="mt-2 text-muted-foreground">Vous pouvez rejoindre les tontines actives.</p>
        <button
          onClick={() => navigate({ to: "/campaigns" })}
          className="mt-6 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-brand"
        >
          Explorer les tontines
        </button>
      </div>
    );
  }

  async function captureGeo() {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => toast.error(err.message),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSubmit() {
    if (!user) return;
    if (!rectoFile || !versoFile) {
      toast.error("Documents d'identité requis");
      return;
    }
    if (!coords) {
      toast.error("Géolocalisation requise");
      return;
    }
    setSubmitting(true);
    try {
      const uid = user.id;
      const rectoPath = `${uid}/id-recto-${Date.now()}.${rectoFile.name.split(".").pop()}`;
      const versoPath = `${uid}/id-verso-${Date.now()}.${versoFile.name.split(".").pop()}`;
      await uploadFile("id-documents", rectoPath, rectoFile);
      await uploadFile("id-documents", versoPath, versoFile);
      let avatarPath: string | null = null;
      if (avatarFile) {
        avatarPath = `${uid}/avatar-${Date.now()}.${avatarFile.name.split(".").pop()}`;
        await uploadFile("avatars", avatarPath, avatarFile);
      }

      await submit({
        data: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
          phone,
          whatsapp,
          city,
          address,
          country: "CI",
          avatar_url: avatarPath,
          id_card_recto_url: rectoPath,
          id_card_verso_url: versoPath,
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });
      toast.success("Dossier soumis ! Un admin va le vérifier.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
        {t("kyc_title")}
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{t("kyc_sub")}</h1>

      {status === "REJECTED" && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {t("kyc_rejected")}
        </div>
      )}
      {status === "PENDING_VERIFICATION" && profile?.kyc_submitted_at && (
        <div className="mt-4 rounded-lg border border-brand-red/40 bg-brand-red/10 p-3 text-sm">
          {t("kyc_pending")} — soumis le{" "}
          {new Date(profile.kyc_submitted_at as unknown as string).toLocaleString()}
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-8 w-8 place-items-center rounded-full font-bold ${step >= n ? "bg-gradient-brand text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
            >
              {n}
            </div>
            <div className="hidden sm:block">
              {n === 1 ? t("kyc_step1") : n === 2 ? t("kyc_step2") : t("kyc_step3")}
            </div>
            {n < 3 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder={t("first_name")} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
            <input placeholder={t("last_name")} value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
            <input type="date" placeholder={t("kyc_dob")} value={dob} onChange={(e) => setDob(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
            <input placeholder={t("kyc_phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
            <input placeholder={t("kyc_whatsapp")} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
            <input placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
            <input placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2.5 text-sm sm:col-span-2" />
            <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
              {t("kyc_avatar")}
              <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} className="text-xs" />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-sm">
              <span className="font-semibold">{t("kyc_id_recto")}</span>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setRectoFile(e.target.files?.[0] ?? null)} />
              {rectoFile && <span className="text-xs text-brand-violet">✓ {rectoFile.name}</span>}
            </label>
            <label className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-sm">
              <span className="font-semibold">{t("kyc_id_verso")}</span>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setVersoFile(e.target.files?.[0] ?? null)} />
              {versoFile && <span className="text-xs text-brand-violet">✓ {versoFile.name}</span>}
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <button
              onClick={captureGeo}
              className="rounded-lg bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-brand"
            >
              📍 {t("kyc_geo")}
            </button>
            {coords && (
              <div className="rounded-lg border border-brand-violet/40 bg-brand-violet/10 px-4 py-2 text-sm">
                {t("kyc_geo_captured")} : {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Précédent
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-md bg-gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
            >
              Suivant →
            </button>
          ) : (
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-md bg-gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
            >
              {submitting ? "…" : t("kyc_submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
