import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useState } from "react";

import { EmptyState, Page, PageHeader, ProgressBar, StatusPill } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BRAND, formatDate, formatDuration, isOverdue } from "@/lib/brand";

export function meta() {
  return [{ title: `My Training · ${BRAND.appName}` }];
}

export default function MyTrainingRoute() {
  const [filter, setFilter] = useState("open");
  const { data: assignments = [], isLoading } = useActionQuery("list-assignments", {
    personId: "me",
  });
  const { data: courses = [] } = useActionQuery("list-courses", {});
  const { data: buckets = [] } = useActionQuery("list-buckets", {});
  const update = useActionMutation("update-assignment");
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const bucketById = new Map(buckets.map((b) => [b.id, b]));

  const rows = assignments.filter((a) =>
    filter === "open" ? a.status !== "completed" : filter === "completed" ? a.status === "completed" : true,
  );
  const remaining = assignments.filter((a) => a.status !== "completed").length;

  return (
    <Page>
      <PageHeader
        eyebrow="My Training"
        title="Your training"
        emphasis="plan."
        description={`${remaining} ${remaining === 1 ? "course remains" : "courses remain"} in your plan. Required courses are listed by due date.`}
      />
      <Tabs value={filter} onValueChange={setFilter} className="mt-8">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {rows.map((a) => {
          const c = courseById.get(a.courseId);
          if (!c) return null;
          return (
            <li key={a.id} className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.title}</p>
                  {a.required ? (
                    <span className="text-[11px] font-medium uppercase tracking-wider text-tsd-slate dark:text-tsd-gold">Required</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.category} · {c.difficulty} · {formatDuration(c.durationMinutes)}
                  {a.bucketId && bucketById.get(a.bucketId) ? ` · ${bucketById.get(a.bucketId)!.name}` : ""}
                  {" · "}
                  <span className={isOverdue(a) ? "font-medium text-destructive" : ""}>
                    {a.status === "completed" ? `Completed ${formatDate(a.completedAt)}` : `Due ${formatDate(a.dueDate)}`}
                  </span>
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <StatusPill status={isOverdue(a) ? "overdue" : a.status} />
                  <span className="tabular-nums text-muted-foreground">{a.progress}%</span>
                </div>
                <ProgressBar value={a.progress} />
              </div>
              <div className="flex gap-2 md:justify-end">
                {a.status !== "completed" ? (
                  <>
                    <Button size="sm" onClick={() => update.mutate({ id: a.id, progress: Math.min(100, a.progress + 25) })}>
                      {a.progress === 0 ? "Start" : "Continue"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: a.id, progress: 100 })}>
                      Complete
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: a.id, progress: 0 })}>
                    Reset
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!isLoading && rows.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Nothing here">No training matches this view.</EmptyState>
        </div>
      )}
    </Page>
  );
}
