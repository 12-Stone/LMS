import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconDots, IconPlus, IconSearch } from "@tabler/icons-react";
import { useState } from "react";

import { CourseThumb, EmptyState, Page, PageHeader, ProgressBar, StatusPill } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BRAND, CATEGORIES, DIFFICULTIES, formatDuration } from "@/lib/brand";
import { formatBytes } from "@/lib/folder-import";

export function meta() {
  return [{ title: `Course Library · ${BRAND.appName}` }];
}

export default function CoursesRoute() {
  const { data: courses = [], isLoading } = useActionQuery("list-courses", {});
  const { data: assignments = [] } = useActionQuery("list-assignments", { personId: "me" });
  const update = useActionMutation("update-course");
  const remove = useActionMutation("delete-course");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<{ id: string; title: string } | null>(null);
  const canManage = useCurrentUser().can("manage-courses");

  const mine = new Map(assignments.map((a) => [a.courseId, a]));
  const categories = [...new Set([...CATEGORIES, ...courses.map((c) => c.category)])];
  const filtered = courses.filter(
    (c) =>
      (category === "all" || c.category === category) &&
      (difficulty === "all" || c.difficulty === difficulty) &&
      (!q || `${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Course Library"
        title="The Knowledge"
        emphasis="Library"
        description="Find the training, resources, and practical guidance you need to do the work well."
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)} className="h-11">
              <IconPlus size={16} /> New course
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 py-6 md:flex-row">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses"
            className="h-11 bg-card pl-9"
            aria-label="Search courses"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 bg-card md:w-48" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="h-11 bg-card md:w-44" aria-label="Difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} of {courses.length} courses
      </p>

      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const a = mine.get(c.id);
          return (
            <article key={c.id} className="flex flex-col">
              <CourseThumb title={c.title} category={c.category} className="rounded-[4px]" />
              <div className="flex flex-1 flex-col pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-xl font-medium leading-snug">{c.title}</h3>
                  {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 shrink-0" aria-label="Course options">
                        <IconDots size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          update.mutate({ id: c.id, status: c.status === "published" ? "draft" : "published" })
                        }
                      >
                        {c.status === "published" ? "Move to draft" : "Publish"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${c.title}"? This also removes it from buckets and assignments.`))
                            remove.mutate({ id: c.id });
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-auto pt-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{c.difficulty}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDuration(c.durationMinutes)}</span>
                    <span aria-hidden>·</span>
                    <span>{c.format}</span>
                    {c.resourceCount > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <button
                          type="button"
                          onClick={() => setViewing({ id: c.id, title: c.title })}
                          className="font-medium text-foreground underline underline-offset-4"
                        >
                          {c.resourceCount} {c.resourceCount === 1 ? "resource" : "resources"}
                        </button>
                      </>
                    )}
                    <span className="ml-auto flex gap-1.5">
                      {c.status === "draft" && <StatusPill status="draft" />}
                      {a && <StatusPill status={a.status} />}
                    </span>
                  </div>
                  {a && <ProgressBar value={a.progress} className="mt-3" />}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!isLoading && filtered.length === 0 && (
        <EmptyState title="No courses found">Try a different search or filter.</EmptyState>
      )}

      <NewCourseDialog open={creating} onOpenChange={setCreating} />
      {viewing && <ResourcesDialog course={viewing} onClose={() => setViewing(null)} />}
    </Page>
  );
}

const EMPTY_COURSE = {
  title: "",
  description: "",
  category: "Onboarding",
  difficulty: "Foundation" as (typeof DIFFICULTIES)[number],
  durationMinutes: 30,
  format: "Video",
};

function NewCourseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useActionMutation("create-course");
  const [form, setForm] = useState(EMPTY_COURSE);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">New course</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { ...form, status: "published" },
              {
                onSuccess: () => {
                  onOpenChange(false);
                  setForm(EMPTY_COURSE);
                },
              },
            );
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="c-title">Title</Label>
            <Input
              id="c-title"
              required
              className="h-11"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea
              id="c-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm({ ...form, difficulty: v as typeof form.difficulty })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-dur">Duration (minutes)</Label>
              <Input
                id="c-dur"
                type="number"
                min={1}
                className="h-11"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Video", "Document", "Workshop", "Interactive"].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={create.isPending}>
              Create course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResourcesDialog({ course, onClose }: { course: { id: string; title: string }; onClose: () => void }) {
  const { data: resources = [], isLoading } = useActionQuery("list-course-resources", { courseId: course.id });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">{course.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading resources…" : `${resources.length} ${resources.length === 1 ? "file" : "files"}`}
        </p>
        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto border-y border-border">
          {resources.map((r) => (
            <li key={r.id}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center gap-3 py-2 hover:bg-secondary/50"
              >
                <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {r.kind}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  {r.path !== r.name && <span className="block truncate text-xs text-muted-foreground">{r.path}</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatBytes(r.sizeBytes)}</span>
              </a>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
