import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/app-shell";
import { useProfile } from "@/hooks/use-auth";

export const Route = createFileRoute("/profile")({
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

function ProfilePage() {
  const { profile, user, isAdmin } = useProfile();
  const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || user?.email || "Profil";
  const status = profile?.kyc_status ?? "PENDING_VERIFICATION";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
        ← Tableau de bord
      </Link>
      <div className="mt-6 rounded-2xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-brand font-display text-xl font-bold text-primary-foreground shadow-brand">
              {(profile?.first_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">{name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              status === "VERIFIED"
                ? "bg-brand-violet/20 text-brand-violet"
                : status === "REJECTED"
                  ? "bg-destructive/20 text-destructive"
                  : "bg-brand-red/20 text-brand-red"
            }`}
          >
            {status === "VERIFIED" ? "✓ KYC vérifié" : status === "REJECTED" ? "KYC rejeté" : "KYC en attente"}
          </span>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Info label="Téléphone" value={profile?.phone} />
          <Info label="WhatsApp" value={profile?.whatsapp} />
          <Info label="Ville" value={profile?.city} />
          <Info label="Langue" value={profile?.preferred_language?.toUpperCase()} />
        </div>

        {profile?.kyc_rejection_reason ? (
          <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Motif de rejet : {profile.kyc_rejection_reason}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/verify" className="rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand">
            Mettre à jour ma vérification
          </Link>
          <Link to="/campaigns" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm hover:bg-muted">
            Voir les Tontines
          </Link>
          {isAdmin && (
            <Link to="/admin" className="rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-2.5 text-sm text-brand-red hover:bg-brand-red/20">
              Console admin
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}