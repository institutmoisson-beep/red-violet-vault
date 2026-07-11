import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/wallet")({
  component: () => (
    <PlaceholderPage
      eyebrow="MSN Wallet"
      title="Portefeuille intelligent"
      description="Solde, dépôts, historique des débits automatiques et MSN Smart Checkout."
    />
  ),
});
