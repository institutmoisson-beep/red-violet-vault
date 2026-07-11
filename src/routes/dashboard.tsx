import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <PlaceholderPage
      eyebrow="Espace membre"
      title="Mon tableau de bord"
      description="Vos tontines actives, prochains tirages, gains et statut de vérification."
    />
  ),
});
