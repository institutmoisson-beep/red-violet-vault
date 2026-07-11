import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/campaigns/$id")({
  component: CampaignDetail,
});

function CampaignDetail() {
  const { id } = Route.useParams();
  return (
    <PlaceholderPage
      eyebrow={`Tontine · ${id}`}
      title="Détail de la tontine"
      description="Participants, cycles, prochains tirages et historique s'afficheront ici après activation du backend."
    />
  );
}
