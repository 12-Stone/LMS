import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useState } from "react";

import { Page, PageHeader, StatusPill } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BRAND, formatDate } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function meta() {
  return [{ title: `SOP & Knowledge Hub · ${BRAND.appName}` }];
}

export default function SopRoute() {
  const { data: sops = [] } = useActionQuery("list-sops", {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const canManage = useCurrentUser().can("manage-sops");
  const filtered = sops.filter((s) => !q || `${s.title} ${s.category} ${s.summary}`.toLowerCase().includes(q.toLowerCase()));
  const selected = sops.find((s) => s.id === selectedId) ?? filtered[0];

  return (
    <Page>
      <PageHeader
        eyebrow="SOP & Knowledge Hub"
        title="The way we"
        emphasis="work."
        description="Approved processes, clear instructions, and the standards behind consistent delivery."
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)} className="h-11">
              <IconPlus size={16} /> New SOP
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-8 pt-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div>
          <div className="relative mb-3">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search processes" className="h-11 bg-card pl-9" />
          </div>
          <ul className="space-y-1">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "w-full rounded-[3px] border-l-2 px-4 py-3 text-left",
                    selected?.id === s.id ? "border-tsd-gold bg-secondary" : "border-transparent hover:bg-secondary/60",
                  )}
                >
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.category} · v{s.version}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {selected && (
          <article className="rounded-[4px] bg-card p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="uppercase tracking-[0.14em]">{selected.category}</span>
              <StatusPill status={selected.status} />
            </div>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight">{selected.title}</h2>
            <p className="mt-3 max-w-[680px] text-base text-muted-foreground">{selected.summary}</p>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-y border-border py-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Owner</dt>
                <dd className="font-medium">{selected.owner}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Version</dt>
                <dd className="font-medium">{selected.version}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last updated</dt>
                <dd className="font-medium">{formatDate(selected.updatedAt)}</dd>
              </div>
            </dl>
            <div className="mt-6 max-w-[680px] whitespace-pre-line text-[15px] leading-relaxed">
              {selected.body.split("\\n").join("\n")}
            </div>
          </article>
        )}
      </div>
      <NewSopDialog open={creating} onOpenChange={setCreating} />
    </Page>
  );
}

function NewSopDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useActionMutation("create-sop");
  const empty = { title: "", category: "", owner: "Brady Hickman", summary: "", body: "" };
  const [form, setForm] = useState(empty);
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">New SOP</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form, {
              onSuccess: () => {
                onOpenChange(false);
                setForm(empty);
              },
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Title</Label>
            <Input id="s-title" required className="h-11" {...field("title")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-cat">Category</Label>
              <Input id="s-cat" required className="h-11" {...field("category")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-owner">Owner</Label>
              <Input id="s-owner" required className="h-11" {...field("owner")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-sum">Summary</Label>
            <Input id="s-sum" className="h-11" {...field("summary")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-body">Procedure</Label>
            <Textarea id="s-body" className="min-h-32" {...field("body")} />
          </div>
          <p className="text-xs text-muted-foreground">New SOPs start in review until an owner approves them.</p>
          <DialogFooter>
            <Button type="submit" className="h-11" disabled={create.isPending}>
              Submit for review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
