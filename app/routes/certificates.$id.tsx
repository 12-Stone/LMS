import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconPrinter } from "@tabler/icons-react";
import { useParams } from "react-router";

import { EmptyState, LogoLockup, Page } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { BRAND, formatDate } from "@/lib/brand";

export function meta() {
  return [{ title: `Certificate · ${BRAND.appName}` }];
}

export default function CertificateRoute() {
  const { id } = useParams();
  const { data: certs = [], isLoading } = useActionQuery("list-certificates", {});
  const { data: people = [] } = useActionQuery("list-people", {});
  const cert = certs.find((c) => c.id === id);
  const person = people.find((p) => p.id === cert?.personId);

  if (isLoading) return null;
  if (!cert) {
    return (
      <Page>
        <EmptyState title="Certificate not found" />
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-6 flex justify-end">
        <Button variant="outline" onClick={() => window.print()}>
          <IconPrinter size={16} /> Print
        </Button>
      </div>
      <div className="mx-auto max-w-[960px] bg-tsd-limestone p-3 text-tsd-charcoal shadow-sm">
        <div className="border border-tsd-gold p-1">
          <div className="border border-tsd-gold/50">
            <div className="flex justify-center bg-tsd-charcoal px-8 py-6">
              <LogoLockup className="w-[300px]" />
            </div>
            <div className="px-8 py-12 text-center md:px-16">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-tsd-slate">{BRAND.appName}</p>
              <h1 className="mt-4 font-display text-5xl font-medium md:text-6xl">Certificate of Completion</h1>
              <div className="mx-auto my-8 h-px w-24 bg-tsd-gold" />
              <p className="text-sm text-tsd-ink/80">This certifies that</p>
              <p className="mt-3 font-display text-4xl italic md:text-5xl">{person?.name ?? "—"}</p>
              <p className="mt-6 text-sm text-tsd-ink/80">has completed the requirements for</p>
              <p className="mt-2 font-display text-3xl font-medium">{cert.title}</p>
              <div className="mt-12 grid gap-8 text-left text-sm sm:grid-cols-3">
                <div className="border-t border-tsd-gold pt-3">
                  <p className="text-xs uppercase tracking-wider text-tsd-ink/70">Date earned</p>
                  <p className="mt-1 font-medium">{formatDate(cert.issuedAt)}</p>
                </div>
                <div className="border-t border-tsd-gold pt-3">
                  <p className="text-xs uppercase tracking-wider text-tsd-ink/70">Certificate ID</p>
                  <p className="mt-1 font-medium tabular-nums">{cert.code}</p>
                </div>
                <div className="border-t border-tsd-gold pt-3">
                  <p className="text-xs uppercase tracking-wider text-tsd-ink/70">Authorized by</p>
                  <p className="mt-1 font-medium">{cert.signatory || BRAND.parent}</p>
                </div>
              </div>
              <p className="mt-10 text-xs text-tsd-ink/70">
                Issued by {BRAND.parent}. Verify this certificate with ID {cert.code} through {BRAND.appName}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
