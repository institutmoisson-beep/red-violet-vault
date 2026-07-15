import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/hooks/use-auth";

export const Route = createFileRoute("/campaigns")({
  component: CampaignsRoute,
});

function CampaignsRoute() {
  const { user } = useProfile();
  const content = <Outlet />;
  if (user) return <AppShell>{content}</AppShell>;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {content}
    </div>
  );
}
