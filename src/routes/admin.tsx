                import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-auth";
import { RequireAuth } from "@/components/app-shell";
import { useI18n, formatMoney } from "@/lib/i18n";
import { adminSetKycStatus } from "@/lib/kyc.functions";
import { executeDraw } from "@/lib/tontine.functions";
import { useServerFn } from "@tanstack/react-start";
import { signedUrl } from "@/lib/storage";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireAuth>
      <AdminGate />
    </RequireAuth>
  ),
});

function AdminGate() {
  const { isAdmin, loading } = useProfile();
  if (loading) return <div className="p-10 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Accès restreint</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette console est réservée aux administrateurs. Contactez un admin pour obtenir le rôle.
        </p>
      </div>
    );
  return <AdminPanel />;
}

function AdminPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"kyc" | "kycHistory" | "campaigns" | "transactions" | "draws" | "gateways">("kyc");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">MSN Tontine</div>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{t("admin_title")}</h1>

      <div className="mt-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card/60 p-1 text-sm">
        {(
          [
            ["kyc", t("admin_kyc_queue")],
              ["kycHistory", "Historique KYC"],
            ["campaigns", t("admin_campaigns")],
            ["transactions", t("admin_transactions")],
            ["draws", t("admin_draws")],
            ["gateways", t("admin_gateways")],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-md px-3 py-2 font-medium transition-all ${
              tab === k ? "bg-gradient-brand text-primary-foreground shadow-brand" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "kyc" && <KycQueue />}
        {tab === "kycHistory" && <KycHistory />}
        {tab === "campaigns" && <CampaignsAdmin />}
        {tab === "transactions" && <TxAdmin />}
        {tab === "draws" && <DrawsAdmin />}
        {tab === "gateways" && <GatewaysAdmin />}
      </div>
    </div>
  );
}

function KycHistory() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [urls, setUrls] = useState<Record<string, { r: string | null; v: string | null; a: string | null }>>({});

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, whatsapp, city, country, avatar_url, id_card_recto_url, id_card_verso_url, kyc_status, kyc_submitted_at, kyc_verified_at, kyc_rejection_reason, kyc_reviewed_at, kyc_reviewed_by, ai_fraud_score, ai_fraud_notes")
      .in("kyc_status", ["VERIFIED", "REJECTED"])
      .order("kyc_reviewed_at", { ascending: false, nullsFirst: false })
      .order("kyc_verified_at", { ascending: false, nullsFirst: false })
      .limit(100);
    const list = (data ?? []) as Array<Record<string, unknown>>;
    setRows(list);
    const entries = await Promise.all(
      list.map(async (p) => {
        const [r, v, a] = await Promise.all([
          signedUrl("id-documents", p.id_card_recto_url as string | null),
          signedUrl("id-documents", p.id_card_verso_url as string | null),
          signedUrl("avatars", p.avatar_url as string | null),
        ]);
        return [p.id as string, { r, v, a }] as const;
      }),
    );
    setUrls(Object.fromEntries(entries));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aucun dossier KYC traité pour le moment
        </div>
      )}
      {rows.map((p) => {
        const u = urls[p.id as string] ?? { r: null, v: null, a: null };
        const reviewedAt = (p.kyc_reviewed_at as string | null) ?? (p.kyc_verified_at as string | null) ?? null;
        const isVerified = p.kyc_status === "VERIFIED";
        return (
          <div key={p.id as string} className="rounded-2xl border border-border bg-card/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {u.a ? (
                  <img src={u.a} alt="Photo du profil vérifié" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-brand font-bold text-primary-foreground">
                    {String(p.first_name ?? "?")[0]}
                  </div>
                )}
                <div>
                  <div className="font-display text-lg font-bold">
                    {String(p.first_name ?? "")} {String(p.last_name ?? "")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {String(p.phone ?? "")} · WhatsApp {String(p.whatsapp ?? "")} · {String(p.city ?? "")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Soumis : {p.kyc_submitted_at ? new Date(p.kyc_submitted_at as string).toLocaleString() : "—"} · Traité : {reviewedAt ? new Date(reviewedAt).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  isVerified ? "bg-brand-violet/20 text-brand-violet" : "bg-destructive/20 text-destructive"
                }`}
              >
                {isVerified ? "✓ Approuvé" : "✕ Rejeté"}
              </span>
            </div>

            {p.kyc_rejection_reason ? (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                Motif : {String(p.kyc_rejection_reason)}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <KycDocument title="ID Recto" url={u.r} fileName={`${String(p.first_name ?? "user")}-recto`} />
              <KycDocument title="ID Verso" url={u.v} fileName={`${String(p.first_name ?? "user")}-verso`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KycDocument({ title, url, fileName }: { title: string; url: string | null; fileName: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            download={fileName}
            className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-semibold hover:bg-muted"
          >
            Télécharger
          </a>
        )}
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={title} className="mt-1 aspect-video w-full rounded-lg border border-border object-cover" />
        </a>
      ) : (
        <div className="mt-1 aspect-video w-full rounded-lg border border-dashed border-border" />
      )}
    </div>
  );
}

function KycQueue() {
  const setStatus = useServerFn(adminSetKycStatus);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [urls, setUrls] = useState<Record<string, { r: string | null; v: string | null; a: string | null }>>({});

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("kyc_status", ["PENDING_VERIFICATION", "REJECTED"])
      .order("kyc_submitted_at", { ascending: false })
      .limit(50);
    const list = (data ?? []) as Array<Record<string, unknown>>;
    setRows(list);
    const entries = await Promise.all(
      list.map(async (p) => {
        const [r, v, a] = await Promise.all([
          signedUrl("id-documents", p.id_card_recto_url as string | null),
          signedUrl("id-documents", p.id_card_verso_url as string | null),
          signedUrl("avatars", p.avatar_url as string | null),
        ]);
        return [p.id as string, { r, v, a }] as const;
      }),
    );
    setUrls(Object.fromEntries(entries));
  }

  useEffect(() => {
    load();
  }, []);

  async function act(uid: string, status: "VERIFIED" | "REJECTED") {
    const reason = status === "REJECTED" ? window.prompt("Motif de rejet ?") ?? undefined : undefined;
    try {
      await setStatus({ data: { user_id: uid, status, reason } });
      toast.success("Statut mis à jour");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucun dossier en attente</div>}
      {rows.map((p) => {
        const u = urls[p.id as string] ?? { r: null, v: null, a: null };
        return (
          <div key={p.id as string} className="rounded-2xl border border-border bg-card/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {u.a ? (
                  <img src={u.a} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-brand font-bold text-primary-foreground">
                    {String(p.first_name ?? "?")[0]}
                  </div>
                )}
                <div>
                  <div className="font-display text-lg font-bold">
                    {String(p.first_name ?? "")} {String(p.last_name ?? "")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {String(p.phone ?? "")} · WhatsApp {String(p.whatsapp ?? "")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    GPS {String(p.latitude ?? "?")},{String(p.longitude ?? "?")} · {String(p.city ?? "")}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-right">
                {typeof p.ai_fraud_score === "number" && (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      (p.ai_fraud_score as number) > 60
                        ? "bg-destructive/20 text-destructive"
                        : (p.ai_fraud_score as number) > 30
                          ? "bg-brand-red/20 text-brand-red"
                          : "bg-brand-violet/20 text-brand-violet"
                    }`}
                  >
                    IA anti-fraude : {p.ai_fraud_score as number}/100
                  </span>
                )}
                {p.ai_fraud_notes ? (
                  <div className="max-w-xs text-xs italic text-muted-foreground">{String(p.ai_fraud_notes)}</div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ID Recto</div>
                {u.r ? (
                  <a href={u.r} target="_blank" rel="noreferrer">
                    <img src={u.r} alt="" className="mt-1 aspect-video w-full rounded-lg border border-border object-cover" />
                  </a>
                ) : (
                  <div className="mt-1 aspect-video w-full rounded-lg border border-dashed border-border" />
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ID Verso</div>
                {u.v ? (
                  <a href={u.v} target="_blank" rel="noreferrer">
                    <img src={u.v} alt="" className="mt-1 aspect-video w-full rounded-lg border border-border object-cover" />
                  </a>
                ) : (
                  <div className="mt-1 aspect-video w-full rounded-lg border border-dashed border-border" />
                )}
              </div>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=15/${p.latitude}/${p.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-xs text-brand-violet hover:underline"
            >
              📍 Voir sur la carte
            </a>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => act(p.id as string, "VERIFIED")}
                className="rounded-md bg-brand-violet/20 px-4 py-2 text-sm font-semibold text-brand-violet hover:bg-brand-violet/30"
              >
                ✓ Approuver
              </button>
              <button
                onClick={() => act(p.id as string, "REJECTED")}
                className="rounded-md bg-destructive/20 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/30"
              >
                ✕ Rejeter
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CampaignsAdmin() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [cats, setCats] = useState<Array<{ id: string; name_fr: string }>>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    total_price: 300000,
    installment_price: 50000,
    max_participants: 6,
    frequency_days: 5,
    draw_hour_utc: 18,
  });
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category_id: "",
    total_price: 0,
    installment_price: 0,
    max_participants: 2,
    frequency_days: 5,
    draw_hour_utc: 18,
    status: "OPEN",
  });
  const [editBusy, setEditBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const STATUS_OPTIONS = ["DRAFT", "OPEN", "ACTIVE", "COMPLETED", "CANCELLED"];

  async function load() {
    const [{ data: c }, { data: cat }] = await Promise.all([
      supabase.from("tontine_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("tontine_categories").select("id, name_fr").order("sort_order"),
    ]);
    setRows((c ?? []) as Array<Record<string, unknown>>);
    setCats(cat ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      let images: string[] = [];
      if (imageFile) {
        const key = `covers/${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("campaign-images").upload(key, imageFile, { upsert: true });
        if (upErr) throw upErr;
        images = [key];
      }
      const { error } = await supabase.from("tontine_campaigns").insert({
        title: form.title,
        description: form.description,
        category_id: form.category_id || null,
        total_price: form.total_price,
        installment_price: form.installment_price,
        max_participants: form.max_participants,
        frequency_days: form.frequency_days,
        draw_hour_utc: form.draw_hour_utc,
        images,
        status: "OPEN",
      });
      if (error) throw error;
      toast.success("Campagne créée");
      setForm({ ...form, title: "", description: "" });
      setImageFile(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: Record<string, unknown>) {
    setEditingId(row.id as string);
    setEditForm({
      title: String(row.title ?? ""),
      description: String(row.description ?? ""),
      category_id: String(row.category_id ?? ""),
      total_price: Number(row.total_price ?? 0),
      installment_price: Number(row.installment_price ?? 0),
      max_participants: Number(row.max_participants ?? 2),
      frequency_days: Number(row.frequency_days ?? 5),
      draw_hour_utc: Number(row.draw_hour_utc ?? 18),
      status: String(row.status ?? "OPEN"),
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  // L'admin peut modifier n'importe quelle campagne, y compris celles qu'il
  // n'a pas créées ou qui sont déjà COMPLETED/CANCELLED — la policy RLS
  // "Admins manage campaigns" (FOR ALL) l'autorise déjà côté base.
  async function saveEdit(id: string) {
    if (!editForm.title.trim()) return;
    setEditBusy(true);
    try {
      const { error } = await supabase
        .from("tontine_campaigns")
        .update({
          title: editForm.title,
          description: editForm.description,
          category_id: editForm.category_id || null,
          total_price: editForm.total_price,
          installment_price: editForm.installment_price,
          max_participants: editForm.max_participants,
          frequency_days: editForm.frequency_days,
          draw_hour_utc: editForm.draw_hour_utc,
          status: editForm.status as "ACTIVE" | "CANCELLED" | "COMPLETED" | "DRAFT" | "OPEN",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Campagne mise à jour");
      setEditingId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function removeCampaign(id: string, title: string) {
    if (!window.confirm(`Supprimer définitivement la campagne "${title}" ? Cette action est irréversible et supprimera aussi ses participants, cotisations et tirages associés.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const { error } = await supabase.from("tontine_campaigns").delete().eq("id", id);
      if (error) throw error;
      toast.success("Campagne supprimée");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <div className="font-display font-bold">Nouvelle campagne</div>
        <div className="mt-3 space-y-2">
          <input placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">Catégorie…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name_fr}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">Valeur totale F CFA<input type="number" value={form.total_price} onChange={(e) => setForm({ ...form, total_price: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
            <label className="text-xs text-muted-foreground">Cotisation F CFA<input type="number" value={form.installment_price} onChange={(e) => setForm({ ...form, installment_price: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
            <label className="text-xs text-muted-foreground">Participants<input type="number" min={2} value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
            <label className="text-xs text-muted-foreground">Fréquence (jours)<input type="number" min={1} value={form.frequency_days} onChange={(e) => setForm({ ...form, frequency_days: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
            <label className="text-xs text-muted-foreground">Heure tirage UTC<input type="number" min={0} max={23} value={form.draw_hour_utc} onChange={(e) => setForm({ ...form, draw_hour_utc: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
          </div>
          <label className="block text-xs text-muted-foreground">
            Image de couverture (JPG/PNG)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs"
            />
            {imageFile && <div className="mt-1 text-[10px] text-brand-violet">{imageFile.name}</div>}
          </label>
          <button disabled={busy} onClick={create} className="w-full rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50">{busy ? "Envoi…" : "Créer"}</button>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campagnes existantes</div>
        <div className="mt-3 space-y-2">
          {rows.map((r) => {
            const id = r.id as string;
            const isEditing = editingId === id;
            if (isEditing) {
              return (
                <div key={id} className="space-y-2 rounded-lg border border-brand-violet/40 bg-card/60 p-3 text-sm">
                  <input
                    placeholder="Titre"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={2}
                  />
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Catégorie…</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name_fr}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">Valeur totale F CFA
                      <input type="number" value={editForm.total_price} onChange={(e) => setEditForm({ ...editForm, total_price: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">Cotisation F CFA
                      <input type="number" value={editForm.installment_price} onChange={(e) => setEditForm({ ...editForm, installment_price: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">Participants
                      <input type="number" min={2} value={editForm.max_participants} onChange={(e) => setEditForm({ ...editForm, max_participants: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">Fréquence (jours)
                      <input type="number" min={1} value={editForm.frequency_days} onChange={(e) => setEditForm({ ...editForm, frequency_days: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">Heure tirage UTC
                      <input type="number" min={0} max={23} value={editForm.draw_hour_utc} onChange={(e) => setEditForm({ ...editForm, draw_hour_utc: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">Statut
                      <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={editBusy}
                      onClick={() => saveEdit(id)}
                      className="rounded-lg bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
                    >
                      {editBusy ? "Enregistrement…" : "Enregistrer"}
                    </button>
                    <button
                      disabled={editBusy}
                      onClick={cancelEdit}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{String(r.title)}</div>
                  <div className="text-xs text-muted-foreground">
                    {String(r.status)} · {String(r.current_participants_count)}/{String(r.max_participants)} · Cycle {String(r.current_cycle)}/{String(r.max_participants)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="font-mono text-xs">{Number(r.installment_price).toLocaleString()} F</div>
                  <button
                    onClick={() => startEdit(r)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-muted"
                    title="Modifier cette campagne"
                  >
                    ✏️
                  </button>
                  <button
                    disabled={deletingId === id}
                    onClick={() => removeCampaign(id, String(r.title))}
                    className="rounded-md border border-brand-red/40 bg-brand-red/10 px-2 py-1 text-xs text-brand-red hover:bg-brand-red/20 disabled:opacity-50"
                    title="Supprimer cette campagne"
                  >
                    {deletingId === id ? "…" : "🗑️"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TxAdmin() {
  const { lang, currency } = useI18n();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  async function load() {
    const { data } = await supabase
      .from("financial_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as Array<Record<string, unknown>>);
  }
  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED" | "DISBURSED") {
    const { error } = await supabase
      .from("financial_transactions")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Mis à jour");
      load();
    }
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id as string} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 p-3 text-sm">
          <div>
            <div className="font-semibold">
              {String(r.type)} · {formatMoney(Number(r.amount), currency, lang)}
            </div>
            <div className="text-xs text-muted-foreground">
              {String(r.payment_method ?? "")} · Ref {String(r.transaction_reference ?? "—")} · {new Date(r.created_at as string).toLocaleString()}
            </div>
            {r.destination_details ? <div className="text-xs">→ {String(r.destination_details)}</div> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              {String(r.status)}
            </span>
            {r.status === "PENDING" && (
              <>
                <button onClick={() => updateStatus(r.id as string, r.type === "WITHDRAWAL" ? "DISBURSED" : "APPROVED")} className="rounded bg-brand-violet/20 px-3 py-1 text-xs font-semibold text-brand-violet">
                  ✓ {r.type === "WITHDRAWAL" ? "Payé" : "Approuver"}
                </button>
                <button onClick={() => updateStatus(r.id as string, "REJECTED")} className="rounded bg-destructive/20 px-3 py-1 text-xs font-semibold text-destructive">
                  ✕ Rejeter
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DrawsAdmin() {
  const runDraw = useServerFn(executeDraw);
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([]);
  const [running, setRunning] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("tontine_campaigns")
      .select("*")
      .in("status", ["ACTIVE"])
      .order("next_draw_at");
    setCampaigns((data ?? []) as Array<Record<string, unknown>>);
  }
  useEffect(() => {
    load();
  }, []);

  async function run(id: string) {
    setRunning(id);
    try {
      const res = await runDraw({ data: { campaign_id: id } });
      toast.success(`🏆 ${res.winner?.first_name} — ${res.code}`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-2">
      {campaigns.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune campagne active</div>}
      {campaigns.map((c) => (
        <div key={c.id as string} className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-4 text-sm">
          <div>
            <div className="font-semibold">{String(c.title)}</div>
            <div className="text-xs text-muted-foreground">
              Cycle {String(c.current_cycle)}/{String(c.max_participants)} · Prochain :{" "}
              {c.next_draw_at ? new Date(c.next_draw_at as string).toLocaleString() : "—"}
            </div>
          </div>
          <button
            disabled={running === c.id}
            onClick={() => run(c.id as string)}
            className="rounded-lg bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
          >
            {running === c.id ? "…" : "🎲 Exécuter le tirage"}
          </button>
        </div>
      ))}
    </div>
  );
}

function GatewaysAdmin() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  async function load() {
    const { data } = await supabase.from("payment_gateways").select("*").order("method_name");
    setRows((data ?? []) as Array<Record<string, unknown>>);
  }
  useEffect(() => {
    load();
  }, []);

  async function update(id: string, patch: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("payment_gateways").update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  }

  return (
    <div className="space-y-3">
      {rows.map((g) => (
        <div key={g.id as string} className="rounded-lg border border-border bg-card/60 p-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{String(g.method_name)}</div>
              <div className="text-xs text-muted-foreground">{String(g.provider)} · {String(g.method_key)}</div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={Boolean(g.is_active)} onChange={(e) => update(g.id as string, { is_active: e.target.checked })} />
              Actif
            </label>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Compte / numéro / adresse
              <input
                defaultValue={String(g.account_details ?? "")}
                onBlur={(e) => update(g.id as string, { account_details: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Template USSD (variables : {"{{AMOUNT}} {{ACCOUNT}} {{PHONE}}"})
              <input
                defaultValue={String(g.ussd_template_syntax ?? "")}
                onBlur={(e) => update(g.id as string, { ussd_template_syntax: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono"
              />
            </label>
            <label className="text-xs text-muted-foreground sm:col-span-2">
              Deep link template
              <input
                defaultValue={String(g.deep_link_template ?? "")}
                onBlur={(e) => update(g.id as string, { deep_link_template: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono"
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
