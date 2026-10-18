import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { Page, PageHeader } from "@/components/brand/brand";
import { RequireCapability } from "@/components/brand/require-capability";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BRAND } from "@/lib/brand";
import { ASSIGNABLE_ROLES, ROLE_LABELS, ROLES, type AssignableRole, type Role } from "@/lib/permissions";

export function meta() {
  return [{ title: `People & Teams · ${BRAND.appName}` }];
}

const ROLE_SUMMARY: Record<Role, string> = {
  learner: "Own training, published courses, approved SOPs.",
  manager: "Adds team analytics, training buckets and assignments, SOP drafts.",
  admin: "Full access, including courses, bulk import, and adding people. Only your account has this role.",
};

export default function PeopleRoute() {
  return (
    <RequireCapability cap="view-team">
      <PeopleContent />
    </RequireCapability>
  );
}

function PeopleContent() {
  const { data: people = [] } = useActionQuery("list-people", {});
  const { me, can } = useCurrentUser();
  const update = useActionMutation("update-person");
  const remove = useActionMutation("delete-person");
  const [adding, setAdding] = useState(false);
  const canEdit = can("manage-people");

  return (
    <Page>
      <PageHeader
        eyebrow="People & Teams"
        title="Who sees"
        emphasis="what."
        description="Only people you add here can activate an account and sign in. Each person's role decides which parts of the Academy they can see and change."
        actions={
          canEdit ? (
            <Button className="h-11" onClick={() => setAdding(true)}>
              <IconPlus size={16} /> Add person
            </Button>
          ) : undefined
        }
      />

      <dl className="grid gap-6 py-8 md:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r} className="border-l-2 border-tsd-gold/70 pl-4">
            <dt className="font-medium">{ROLE_LABELS[r]}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{ROLE_SUMMARY[r]}</dd>
          </div>
        ))}
      </dl>

      {(update.error || remove.error) && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {(update.error ?? remove.error)?.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-[4px] bg-card">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="w-52 px-4 py-3 font-medium">Role</th>
              {canEdit && <th className="w-14 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {people.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {p.name} {p.id === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </td>
                <td className="px-4 py-3">
                  {p.team}
                  {p.title && <span className="block text-xs text-muted-foreground">{p.title}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.lastSeenAt ? "Active" : "Invited, not yet activated"}</td>
                <td className="px-4 py-3">
                  {canEdit && p.role !== "admin" ? (
                    <Select value={p.role} onValueChange={(role) => update.mutate({ id: p.id, role: role as AssignableRole })}>
                      <SelectTrigger className="h-10" aria-label={`Role for ${p.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    ROLE_LABELS[p.role as Role] ?? p.role
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    {p.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => {
                          if (confirm(`Remove ${p.name}? They will lose access and their training assignments will be deleted.`))
                            remove.mutate({ id: p.id });
                        }}
                      >
                        <IconTrash size={16} />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && <AddPersonDialog open={adding} onOpenChange={setAdding} />}
    </Page>
  );
}

const EMPTY = { name: "", email: "", title: "", team: "", role: "learner" as AssignableRole };

function AddPersonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useActionMutation("create-person");
  const [form, setForm] = useState(EMPTY);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Add person</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form, {
              onSuccess: () => {
                onOpenChange(false);
                setForm(EMPTY);
              },
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" required className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Work email</Label>
              <Input
                id="p-email"
                type="email"
                required
                className="h-11"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-team">Team</Label>
              <Input id="p-team" required className="h-11" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Job title</Label>
              <Input id="p-title" className="h-11" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as AssignableRole })}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]} — {ROLE_SUMMARY[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            They can then choose "Activate your account" on the sign-in page using this email.
          </p>
          {create.error && (
            <p role="alert" className="text-sm text-destructive">
              {create.error.message}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" className="h-11" disabled={create.isPending}>
              Add person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
