import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash, IconUserPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { EmptyState, Page, PageHeader } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RequireCapability } from "@/components/brand/require-capability";
import { BRAND, formatDuration } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function meta() {
  return [{ title: `Training Buckets · ${BRAND.appName}` }];
}

export default function BucketsRoute() {
  return (
    <RequireCapability cap="manage-buckets">
      <BucketsRouteContent />
    </RequireCapability>
  );
}

function BucketsRouteContent() {
  const { data: buckets = [] } = useActionQuery("list-buckets", {});
  const { data: courses = [] } = useActionQuery("list-courses", {});
  const setCourses = useActionMutation("set-bucket-courses");
  const removeBucket = useActionMutation("delete-bucket");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [adding, setAdding] = useState("");

  const selected = buckets.find((b) => b.id === selectedId) ?? buckets[0];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const bucketCourses = selected
    ? selected.courseIds.map((id) => courseById.get(id)).filter((c) => c !== undefined)
    : [];
  const totalMin = bucketCourses.reduce((s, c) => s + c.durationMinutes, 0);
  const available = courses.filter((c) => !selected?.courseIds.includes(c.id));

  const save = (ids: string[]) => {
    if (selected) setCourses.mutate({ bucketId: selected.id, courseIds: ids });
  };
  const move = (i: number, dir: -1 | 1) => {
    if (!selected) return;
    const ids = [...selected.courseIds];
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    save(ids);
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Training Buckets"
        title="Training, organized around the"
        emphasis="work."
        description="Build reusable training collections and assign them to the right people in a few steps."
        actions={
          <Button onClick={() => setCreating(true)} className="h-11">
            <IconPlus size={16} /> New bucket
          </Button>
        }
      />

      <div className="grid gap-8 pt-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ul className="space-y-1" aria-label="Buckets">
          {buckets.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={cn(
                  "w-full rounded-[3px] border-l-2 px-4 py-3 text-left transition-colors",
                  selected?.id === b.id ? "border-tsd-gold bg-secondary" : "border-transparent hover:bg-secondary/60",
                )}
              >
                <p className="font-medium">{b.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {b.courseIds.length} courses · {b.assigneeCount} assigned · {b.audience}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <section className="rounded-[4px] bg-card p-6 md:p-8">
            <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{selected.audience}</p>
                <h2 className="mt-1 font-display text-3xl font-medium">{selected.name}</h2>
                <p className="mt-2 max-w-[560px] text-sm text-muted-foreground">{selected.description}</p>
                <p className="mt-3 text-sm">
                  {bucketCourses.length} courses · {formatDuration(totalMin)} total
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setAssigning(true)} disabled={!bucketCourses.length} className="h-11">
                  <IconUserPlus size={16} /> Assign
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label="Delete bucket"
                  onClick={() => {
                    if (confirm(`Delete "${selected.name}"? Existing assignments are kept.`)) {
                      removeBucket.mutate({ id: selected.id });
                      setSelectedId(null);
                    }
                  }}
                >
                  <IconTrash size={16} />
                </Button>
              </div>
            </div>

            <ol className="divide-y divide-border">
              {bucketCourses.map((c, i) => (
                <li key={c.id} className="flex items-center gap-4 py-3">
                  <span className="w-6 font-display text-xl text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.category} · {c.difficulty} · {formatDuration(c.durationMinutes)}
                      {c.status === "draft" ? " · Draft" : ""}
                    </p>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                      <IconArrowUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={i === bucketCourses.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label="Move down"
                    >
                      <IconArrowDown size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => save(selected.courseIds.filter((id) => id !== c.id))}
                      aria-label="Remove from bucket"
                    >
                      <IconX size={16} />
                    </Button>
                  </div>
                </li>
              ))}
              {bucketCourses.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">This bucket has no courses yet.</li>
              )}
            </ol>

            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <Select value={adding} onValueChange={setAdding}>
                <SelectTrigger className="h-11 flex-1" aria-label="Add a course">
                  <SelectValue placeholder="Add a course from the library" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-11"
                disabled={!adding}
                onClick={() => {
                  save([...selected.courseIds, adding]);
                  setAdding("");
                }}
              >
                Add course
              </Button>
            </div>
          </section>
        ) : (
          <EmptyState title="No buckets yet">Create a bucket to group training for a role or team.</EmptyState>
        )}
      </div>

      <NewBucketDialog open={creating} onOpenChange={setCreating} />
      {selected && (
        <AssignDialog open={assigning} onOpenChange={setAssigning} bucketId={selected.id} bucketName={selected.name} />
      )}
    </Page>
  );
}

function NewBucketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useActionMutation("create-bucket");
  const [form, setForm] = useState({ name: "", description: "", audience: "" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">New training bucket</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { ...form, audience: form.audience || "All staff" },
              {
                onSuccess: () => {
                  onOpenChange(false);
                  setForm({ name: "", description: "", audience: "" });
                },
              },
            );
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="b-name">Name</Label>
            <Input id="b-name" required className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-aud">Audience</Label>
            <Input
              id="b-aud"
              placeholder="e.g. SEO team"
              className="h-11"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-desc">Description</Label>
            <Textarea id="b-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit" className="h-11" disabled={create.isPending}>
              Create bucket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  bucketId,
  bucketName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bucketId: string;
  bucketName: string;
}) {
  const { data: people = [] } = useActionQuery("list-people", {});
  const assign = useActionMutation("assign-bucket");
  const [picked, setPicked] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const teams = [...new Set(people.map((p) => p.team))];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setPicked([]);
          setResult(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Assign {bucketName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <Button
              key={t}
              size="sm"
              variant="outline"
              onClick={() =>
                setPicked([...new Set([...picked, ...people.filter((p) => p.team === t).map((p) => p.id)])])
              }
            >
              + {t}
            </Button>
          ))}
        </div>
        <ul className="max-h-64 divide-y divide-border overflow-y-auto border-y border-border">
          {people.map((p) => (
            <li key={p.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                <Checkbox
                  checked={picked.includes(p.id)}
                  onCheckedChange={(v) => setPicked(v ? [...picked, p.id] : picked.filter((id) => id !== p.id))}
                />
                <span className="flex-1 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.title} · {p.team}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="space-y-1.5">
          <Label htmlFor="due">Due date</Label>
          <Input id="due" type="date" className="h-11" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {result && (
          <p className="text-sm" role="status">
            {result}
          </p>
        )}
        <DialogFooter>
          <Button
            className="h-11"
            disabled={!picked.length || assign.isPending}
            onClick={() =>
              assign.mutate(
                { bucketId, personIds: picked, dueDate: dueDate || undefined },
                {
                  onSuccess: (r) =>
                    setResult(
                      r.created
                        ? `${r.created} course assignments created for ${picked.length} ${picked.length === 1 ? "person" : "people"}.`
                        : "Everyone selected already has these courses.",
                    ),
                },
              )
            }
          >
            Assign to {picked.length || ""} {picked.length === 1 ? "person" : "people"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
