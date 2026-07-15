import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/campaigns")({
  component: CampaignsRoute,
});

function CampaignsRoute() {
  return <Outlet />;
}
