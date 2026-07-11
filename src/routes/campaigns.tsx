import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Tontines ouvertes — MSN Tontine" },
      { name: "description", content: "Parcourez les tontines actives par catégorie : moto, électroménager, alimentaire, machines et plus." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Explorer"
      title="Tontines ouvertes"
      description="La liste des campagnes actives, filtres par catégorie et détails des cycles s'afficheront ici."
    />
  ),
});
