import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminListUsers } from "@/lib/admin-users.functions";
import { PRESENCE_ROOM } from "@/components/activity-tracker";
import { signedUrl } from "@/lib/storage";

type Profile = Record<string, any> & { id: string };
type AuthUser = { id: string; email: string | null; created_at: string; last_sign_in_at: string | null };
type Activity = { id: string; user_id: string; event_type: string; path: string | null; detail: string | null; created_at: string };

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-FR") : "—");
const EVENT_LABELS: Record<string, string> = {
  page_view: "Page visitée",
  login: "Connexion",
  search: "Recherche",
  join_tontine: "A rejoint une tontine",
  pay_installment: "Cotisation payée",
  withdrawal_request: "Demande de retrait",
};

function useNames() {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("profiles").select("id, first_name, last_name").then(({ data }) => {
      const m: Record<string, string> = {};
      (data ?? []).forEach((p) => (m[p.id] = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()));
      setNames(m);
    });
  }, []);
  return names;
}

export function UsersAdmin() {
  const listUsers = useServerFn(adminListUsers);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<Record<string, AuthUser>>({});
  const [wallets, setWallets] = useState<Record<string, { balance: number; debt: number }>>({});
  const [parts, setParts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setProfiles((data ?? []) as Profile[]));
    supabase.from("wallets").select("user_id, balance, debt").then(({ data }) => {
      const m: Record<string, { balance: number; debt: number }> = {};
      (data ?? []).forEach((w) => (m[w.user_id] = { balance: Number(w.balance), debt: Number(w.debt) }));
      setWallets(m);
    });
    supabase.from("tontine_participants").select("user_id").then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((p) => (m[p.user_id] = (m[p.user_id] ?? 0) + 1));
      setParts(m);
    });
    listUsers()
      .then((list) => setAuth(Object.fromEntries(list.map((u) => [u.id, u]))))
      .catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return profiles.filter((p) =>
      !t || [p.first_name, p.last_name, p.phone, p.whatsapp, p.city, auth[p.id]?.email].join(" ").toLowerCase().includes(t),
    );
  }, [profiles, auth, q]);

  const openDoc = async (path?: string | null) => {
    if (!path) return;
    const bucket = path.startsWith("http") ? null : "kyc-documents";
    if (!bucket) return window.open(path, "_blank");
    const url = await signedUrl(bucket as never, path).catch(() => null);
    if (url) window.open(url, "_blank");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Utilisateurs ({profiles.length})</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email, téléphone, ville…"
          className="w-full max-w-xs rounded-md border border-border bg-card px-3 py-2 text-sm" />
      </div>
      {error && <p className="mt-2 text-xs text-brand-red">Emails indisponibles : {error}</p>}
      <div className="mt-4 space-y-2">
        {rows.map((p) => {
          const a = auth[p.id];
          const w = wallets[p.id];
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card/60">
              <button onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left">
                <div>
                  <div className="font-semibold">{`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(sans nom)"}</div>
                  <div className="text-xs text-muted-foreground">{a?.email ?? "—"} · {p.phone ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border border-border px-2 py-0.5">{p.kyc_status}</span>
                  <span className="text-muted-foreground">{open === p.id ? "▲" : "▼"}</span>
                </div>
              </button>
              {open === p.id && (
                <div className="grid gap-x-6 gap-y-1 border-t border-border p-4 text-xs sm:grid-cols-2">
                  {[
                    ["Email", a?.email],
                    ["Inscrit le", fmt(a?.created_at ?? p.created_at)],
                    ["Dernière connexion", fmt(a?.last_sign_in_at)],
                    ["Date de naissance", p.date_of_birth],
                    ["Téléphone", p.phone],
                    ["WhatsApp", p.whatsapp],
                    ["Adresse", p.address],
                    ["Ville / Pays", `${p.city ?? "—"} / ${p.country ?? "—"}`],
                    ["GPS", p.latitude ? `${p.latitude}, ${p.longitude}` : null],
                    ["Langue / Devise", `${p.preferred_language ?? "—"} / ${p.preferred_currency ?? "—"}`],
                    ["Solde portefeuille", w ? `${w.balance.toLocaleString("fr-FR")} F CFA` : null],
                    ["Dette", w ? `${w.debt.toLocaleString("fr-FR")} F CFA` : null],
                    ["Tontines rejointes", String(parts[p.id] ?? 0)],
                    ["KYC soumis / vérifié", `${fmt(p.kyc_submitted_at)} / ${fmt(p.kyc_verified_at)}`],
                    ["Motif rejet", p.kyc_rejection_reason],
                    ["Score fraude IA", p.ai_fraud_score != null ? `${p.ai_fraud_score} — ${p.ai_fraud_notes ?? ""}` : null],
                    ["ID utilisateur", p.id],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-3 border-b border-border/40 py-1">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-right break-all">{v || "—"}</span>
                    </div>
                  ))}
                  <div className="col-span-full mt-2 flex flex-wrap gap-2">
                    {p.latitude && (
                      <a className="rounded-md border border-border px-3 py-1" target="_blank" rel="noreferrer"
                        href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}>📍 Carte</a>
                    )}
                    {p.id_card_recto_url && <button className="rounded-md border border-border px-3 py-1" onClick={() => openDoc(p.id_card_recto_url)}>CNI recto</button>}
                    {p.id_card_verso_url && <button className="rounded-md border border-border px-3 py-1" onClick={() => openDoc(p.id_card_verso_url)}>CNI verso</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityAdmin() {
  const names = useNames();
  const [online, setOnline] = useState<string[]>([]);
  const [events, setEvents] = useState<Activity[]>([]);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const since = new Date(Date.now() - 366 * 864e5).toISOString();
    (supabase.from as any)("user_activity")
      .select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(20000)
      .then(({ data }: { data: Activity[] | null }) => setEvents(data ?? []));
    const ch = supabase
      .channel(`activity-admin-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_activity" }, (pl) =>
        setEvents((e) => [pl.new as Activity, ...e]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const { data } = { data: null };
    void data;
    let uid = "admin";
    supabase.auth.getSession().then(({ data }) => (uid = data.session?.user.id ?? uid));
    const ch = supabase.channel(PRESENCE_ROOM, { config: { presence: { key: uid } } });
    ch.on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState())));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const periods = { "Aujourd'hui": 864e5, "7 jours": 7 * 864e5, "30 jours": 30 * 864e5, "12 mois": 365 * 864e5 };
    return Object.entries(periods).map(([label, ms]) => {
      const ev = events.filter((e) => now - new Date(e.created_at).getTime() <= ms);
      return {
        label,
        users: new Set(ev.map((e) => e.user_id)).size,
        logins: ev.filter((e) => e.event_type === "login").length,
        views: ev.filter((e) => e.event_type === "page_view").length,
        searches: ev.filter((e) => e.event_type === "search").length,
      };
    });
  }, [events]);

  const topSearches = useMemo(() => {
    const m: Record<string, number> = {};
    events.filter((e) => e.event_type === "search" && e.detail).forEach((e) => {
      const k = e.detail!.toLowerCase();
      m[k] = (m[k] ?? 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [events]);

  const topPages = useMemo(() => {
    const m: Record<string, number> = {};
    events.filter((e) => e.event_type === "page_view" && e.path).forEach((e) => (m[e.path!] = (m[e.path!] ?? 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  const feed = events.filter((e) => filterType === "all" || e.event_type === filterType).slice(0, 200);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-red/40 bg-gradient-brand-soft p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-red" /> En ligne maintenant (temps réel)
        </div>
        <div className="mt-1 font-display text-4xl font-bold text-gradient-brand">{online.length}</div>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {online.map((id) => <span key={id} className="rounded-full bg-card px-2 py-0.5">{names[id] || id.slice(0, 8)}</span>)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">{s.users} <span className="text-xs font-normal text-muted-foreground">utilisateurs actifs</span></div>
            <div className="mt-1 text-xs text-muted-foreground">{s.logins} connexions · {s.views} pages · {s.searches} recherches</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <h3 className="font-display font-bold">🔎 Recherches les plus fréquentes</h3>
          {topSearches.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Aucune recherche pour l'instant.</p>}
          {topSearches.map(([k, n]) => <div key={k} className="mt-1 flex justify-between text-sm"><span>{k}</span><span className="text-muted-foreground">{n}</span></div>)}
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <h3 className="font-display font-bold">📄 Pages les plus visitées</h3>
          {topPages.map(([k, n]) => <div key={k} className="mt-1 flex justify-between text-sm"><span className="font-mono">{k}</span><span className="text-muted-foreground">{n}</span></div>)}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Journal d'activité en direct</h3>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-border bg-card px-2 py-1 text-xs">
            <option value="all">Toutes les actions</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="mt-3 max-h-[600px] space-y-1 overflow-y-auto text-xs">
          {feed.map((e) => (
            <div key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-border/40 py-1.5">
              <span><b>{names[e.user_id] || e.user_id.slice(0, 8)}</b> — {EVENT_LABELS[e.event_type] ?? e.event_type}
                {e.detail ? <> : <i>{e.detail}</i></> : null}{e.path ? <span className="text-muted-foreground"> ({e.path})</span> : null}</span>
              <span className="text-muted-foreground">{fmt(e.created_at)}</span>
            </div>
          ))}
          {feed.length === 0 && <p className="text-muted-foreground">Aucune activité enregistrée.</p>}
        </div>
      </div>
    </div>
  );
}
