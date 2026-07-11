import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Se connecter — MSN Tontine" },
      { name: "description", content: "Créez votre compte MSN Tontine et lancez votre vérification KYC." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Authentification"
      title="Se connecter à MSN Tontine"
      description="La connexion par e-mail et Google sera activée dès l'activation du backend Lovable Cloud (prochaine étape)."
    />
  ),
});
