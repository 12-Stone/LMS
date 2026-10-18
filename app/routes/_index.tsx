import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconArrowRight, IconCertificate } from "@tabler/icons-react";
import { Link } from "react-router";

import {
  CourseThumb,
  EmptyState,
  Page,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Stat,
  StatusPill,
} from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BRAND, formatDate, formatDuration, isOverdue } from "@/lib/brand";

export function meta() {
  return [{ title: `Dashboard · ${BRAND.appName}` }];
}

export default function DashboardRoute() {
  const { me: person } = useCurrentUser();
  const { data: assignments = [] } = useActionQuery("list-assignments", { personId: "me" });
  const { data: courses = [] } = useActionQuery("list-courses", {});
  const { data: buckets = [] } = useActionQuery("list-buckets", {});
  const { data: certificates = [] } = useActionQuery("list-certificates", {});
  const update = useActionMutation("update-assignment");

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const open = assignments.filter((a) => a.status !== "completed");
  const required = open.filter((a) => a.required);
  const current = open.find((a) => a.status === "in_progress") ?? open[0];
  const currentCourse = current && courseById.get(current.courseId);
  const myBucketIds = [...new Set(assignments.map((a) => a.bucketId).filter(Boolean))];
  const myBuckets = buckets.filter((b) => myBucketIds.includes(b.id));
  const myCerts = certificates.filter((c) => c.personId === person?.id);
  const overdue = open.filter(isOverdue);

  const byCategory = new Map<string, { done: number; total: number }>();
  for (const a of assignments) {
    const cat = courseById.get(a.courseId)?.category;
    if (!cat) continue;
    const entry = byCategory.get(cat) ?? { done: 0, total: 0 };
    entry.total += 100;
    entry.done += a.progress;
    byCategory.set(cat, entry);
  }

  const summary =
    required.length === 0
      ? "Your required training is complete."
      : `${required.length} required ${required.length === 1 ? "course remains" : "courses remain"} in your plan${overdue.length ? `, ${overdue.length} past due` : ""}.`;

  return (
    <Page>
      <PageHeader
        eyebrow={person ? `Welcome, ${person.name.split(" ")[0]}` : BRAND.appName}
        title="Build on what you"
        emphasis="know."
        description="Your assigned training, next steps, and development progress—all in one place."
      />

      <div className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        <Stat label="Required remaining" value={required.length} note={summary} />
        <Stat label="In progress" value={open.filter((a) => a.status === "in_progress").length} />
        <Stat label="Completed" value={assignments.length - open.length} />
        <Stat label="Certificates" value={myCerts.length} />
      </div>

      <section className="mb-12">
        <SectionTitle>Continue learning</SectionTitle>
        {current && currentCourse ? (
          <div className="grid overflow-hidden rounded-[4px] bg-card md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <CourseThumb title={currentCourse.title} category={currentCourse.category} className="h-full min-h-44" />
            <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {currentCourse.difficulty} · {formatDuration(currentCourse.durationMinutes)} · Due{" "}
                  {formatDate(current.dueDate)}
                </p>
                <h3 className="mt-2 font-display text-3xl font-medium leading-tight">{currentCourse.title}</h3>
                <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-muted-foreground">
                  {currentCourse.description}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{current.progress}% complete</span>
                  <StatusPill status={isOverdue(current) ? "overdue" : current.status} />
                </div>
                <ProgressBar value={current.progress} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={() =>
                      update.mutate({ id: current.id, progress: Math.min(100, current.progress + 25) })
                    }
                    disabled={update.isPending}
                  >
                    {current.progress === 0 ? "Start course" : "Continue"} <IconArrowRight size={16} />
                  </Button>
                  <Button variant="outline" onClick={() => update.mutate({ id: current.id, progress: 100 })}>
                    Mark complete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="Nothing in progress">Your assigned training will appear here.</EmptyState>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <SectionTitle
            action={
              <Link to="/my-training" className="text-sm font-medium underline-offset-4 hover:underline">
                View all training
              </Link>
            }
          >
            Required training
          </SectionTitle>
          <ul className="divide-y divide-border border-y border-border">
            {required.map((a) => {
              const c = courseById.get(a.courseId);
              if (!c) return null;
              return (
                <li key={a.id} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.category} · {formatDuration(c.durationMinutes)}
                    </p>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <ProgressBar value={a.progress} />
                  </div>
                  <div className="w-28 text-right text-xs">
                    <p className={isOverdue(a) ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {isOverdue(a) ? "Past due" : "Due"} {formatDate(a.dueDate)}
                    </p>
                  </div>
                </li>
              );
            })}
            {required.length === 0 && <li className="py-6 text-sm text-muted-foreground">All required training is complete.</li>}
          </ul>

          <div className="mt-12">
            <SectionTitle>Assigned buckets</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {myBuckets.map((b) => {
                const mine = assignments.filter((a) => a.bucketId === b.id);
                const pct = mine.length ? Math.round(mine.reduce((s, a) => s + a.progress, 0) / mine.length) : 0;
                return (
                  <div key={b.id} className="rounded-[4px] bg-secondary p-5">
                    <p className="font-display text-xl font-medium">{b.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {mine.filter((a) => a.status === "completed").length} of {mine.length} courses complete
                    </p>
                    <ProgressBar value={pct} className="mt-4 bg-background" />
                  </div>
                );
              })}
              {myBuckets.length === 0 && <p className="text-sm text-muted-foreground">No buckets assigned.</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-12">
          <section>
            <SectionTitle>Upcoming deadlines</SectionTitle>
            <ul className="space-y-3">
              {open.slice(0, 4).map((a) => (
                <li key={a.id} className="flex gap-4">
                  <div className="w-14 shrink-0 border-r border-border pr-3 text-right">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {a.dueDate ? new Date(`${a.dueDate}T12:00:00`).toLocaleDateString("en-US", { month: "short" }) : "—"}
                    </p>
                    <p className="font-display text-2xl leading-none">{a.dueDate?.slice(8) ?? ""}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{courseById.get(a.courseId)?.title}</p>
                    <StatusPill status={isOverdue(a) ? "overdue" : a.status} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle>Skill development</SectionTitle>
            <ul className="space-y-4">
              {[...byCategory.entries()].map(([cat, v]) => (
                <li key={cat}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{cat}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round((v.done / v.total) * 100)}%</span>
                  </div>
                  <ProgressBar value={(v.done / v.total) * 100} />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle>Certificates</SectionTitle>
            {myCerts.map((c) => (
              <Link
                key={c.id}
                to={`/certificates/${c.id}`}
                className="flex items-center gap-4 rounded-[4px] bg-tsd-charcoal p-4 text-tsd-limestone transition-opacity hover:opacity-90"
              >
                <span className="flex size-10 rotate-45 items-center justify-center border border-tsd-gold">
                  <IconCertificate size={18} className="-rotate-45 text-tsd-gold" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg">{c.title}</span>
                  <span className="text-xs text-tsd-limestone/70">
                    Earned {formatDate(c.issuedAt)} · {c.code}
                  </span>
                </span>
              </Link>
            ))}
            {myCerts.length === 0 && <p className="text-sm text-muted-foreground">Complete a bucket to earn a certificate.</p>}
          </section>
        </aside>
      </div>
    </Page>
  );
}
