import { Link, useLocation } from "react-router";

import { NAV } from "@/components/layout/Layout";
import { Page, PageHeader } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { RequireCapability } from "@/components/brand/require-capability";
import { BRAND } from "@/lib/brand";
import { ROUTE_CAPABILITY } from "@/lib/permissions";

const COPY: Record<string, { title: string; emphasis?: string; description: string }> = {
  "/coach": {
    title: BRAND.assistantName,
    description:
      "Your AI training and knowledge assistant. Ask a question, review a process, or practice a skill. Answers about agency procedures are grounded in approved training materials.",
  },
  "/learning-paths": { title: "Learning", emphasis: "paths.", description: "Sequenced development plans for each role." },
  "/assessments": { title: "Assessments", description: "Knowledge checks and practical reviews tied to courses." },
  "/skills": { title: "Skills & career", emphasis: "growth.", description: "Skill frameworks and progression for every role." },
  "/admin": { title: "Administration", description: "Brand configuration, permissions, and platform settings." },
};

export default function PlaceholderRoute() {
  const { pathname } = useLocation();
  const cap = ROUTE_CAPABILITY[pathname];
  return cap ? (
    <RequireCapability cap={cap}>
      <Placeholder pathname={pathname} />
    </RequireCapability>
  ) : (
    <Placeholder pathname={pathname} />
  );
}

function Placeholder({ pathname }: { pathname: string }) {
  const nav = NAV.find((n) => n.to === pathname);
  const copy = COPY[pathname] ?? { title: "Page not found", description: "This page doesn't exist." };
  return (
    <Page>
      <PageHeader eyebrow={nav?.label ?? BRAND.appName} {...copy} />
      <div className="tsd-pattern mt-10 rounded-[4px] bg-tsd-charcoal px-8 py-16 text-tsd-limestone">
        <p className="font-display text-3xl">This module is not built yet.</p>
        <p className="mt-2 max-w-[560px] text-sm text-tsd-limestone/75">
          It is part of the planned platform and will be added in a later release.
        </p>
        <Button asChild className="mt-6 bg-tsd-gold text-tsd-charcoal hover:bg-tsd-gold/90">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </Page>
  );
}
