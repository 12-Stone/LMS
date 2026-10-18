import { Link } from "react-router";

import { Page, PageHeader } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Capability } from "@/lib/permissions";

export function RequireCapability({ cap, children }: { cap: Capability; children: React.ReactNode }) {
  const { me, isLoading, can } = useCurrentUser();
  if (isLoading || !me) return null;
  if (can(cap)) return <>{children}</>;
  return (
    <Page>
      <PageHeader
        eyebrow="Restricted"
        title="This area isn't available to your role."
        description="If you need access, ask an administrator to update your role in People & Teams."
      />
      <Button asChild className="mt-8">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </Page>
  );
}
