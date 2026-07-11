import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/admin")({
  component: () => (
    <PlaceholderPage
      eyebrow="Console admin"
      title="Administration MSN"
      description="File de vérification KYC, création de campagnes, gestion des cycles et journal des tirages."
    />
  ),
});
