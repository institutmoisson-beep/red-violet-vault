import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/verify")({
  component: () => (
    <PlaceholderPage
      eyebrow="Vérification KYC"
      title="Vérifiez votre identité"
      description="Assistant en 3 étapes : informations personnelles, pièce d'identité (recto/verso), géolocalisation en direct."
    />
  ),
});
