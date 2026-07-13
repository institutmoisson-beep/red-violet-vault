import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Connexion — MSN Tontine" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/verify`,
            data: { first_name: firstName, last_name: lastName },
          },
        });
        if (error) throw error;
        toast.success("Compte créé ! Complétez votre vérification KYC.");
        navigate({ to: "/verify" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connexion réussie");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
          MSN Tontine
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          {mode === "signin" ? t("signin_title") : t("signup_title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? t("signin_sub") : t("signup_sub")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder={t("first_name")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-md border border-border bg-card px-3 py-2.5 text-sm"
              />
              <input
                required
                placeholder={t("last_name")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-md border border-border bg-card px-3 py-2.5 text-sm"
              />
            </div>
          )}
          <input
            required
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2.5 text-sm"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2.5 text-sm"
          />
          <button
            disabled={loading}
            className="mt-2 rounded-lg bg-gradient-brand px-4 py-3 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? t("login") : t("signup")}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Créer un compte →" : "J'ai déjà un compte"}
        </button>

        <Link to="/" className="mt-2 text-center text-xs text-muted-foreground hover:text-foreground">
          ← Retour à l'accueil
        </Link>
      </main>
    </div>
  );
}
