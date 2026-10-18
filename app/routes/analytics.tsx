import { useActionQuery } from "@agent-native/core/client/hooks";

import { Page, PageHeader, ProgressBar, SectionTitle, Stat } from "@/components/brand/brand";
import { RequireCapability } from "@/components/brand/require-capability";
import { BRAND, isOverdue } from "@/lib/brand";

export function meta() {
  return [{ title: `Analytics · ${BRAND.appName}` }];
}

export default function AnalyticsRoute() {
  return (
    <RequireCapability cap="view-team">
      <AnalyticsRouteContent />
    </RequireCapability>
  );
}

function AnalyticsRouteContent() {
  const { data: people = [] } = useActionQuery("list-people", {});
  const { data: assignments = [] } = useActionQuery("list-assignments", {});
  const { data: courses = [] } = useActionQuery("list-courses", {});

  const completed = assignments.filter((a) => a.status === "completed").length;
  const rate = assignments.length ? Math.round((completed / assignments.length) * 100) : 0;
  const overdue = assignments.filter(isOverdue);
  const overduePeople = new Set(overdue.map((a) => a.personId)).size;

  const perPerson = people.map((p) => {
    const mine = assignments.filter((a) => a.personId === p.id);
    const done = mine.filter((a) => a.status === "completed").length;
    return {
      ...p,
      total: mine.length,
      done,
      overdue: mine.filter(isOverdue).length,
      pct: mine.length ? Math.round(mine.reduce((s, a) => s + a.progress, 0) / mine.length) : 0,
    };
  });

  const teams = [...new Set(people.map((p) => p.team))].map((team) => {
    const rows = perPerson.filter((p) => p.team === team && p.total);
    const total = rows.reduce((s, p) => s + p.total, 0);
    const done = rows.reduce((s, p) => s + p.done, 0);
    return { team, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  });

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const byCategory = new Map<string, number>();
  for (const a of overdue) {
    const cat = courseById.get(a.courseId)?.category ?? "Other";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }

  const overdueSentence =
    overduePeople === 0
      ? "No one has overdue training."
      : `${overduePeople} ${overduePeople === 1 ? "employee has" : "employees have"} overdue training.`;

  return (
    <Page>
      <PageHeader
        eyebrow="Analytics"
        title="A clearer view of team"
        emphasis="development."
        description="Understand progress, identify gaps, and help your team build the skills that matter."
      />

      <div className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        <Stat label="Completion rate" value={`${rate}%`} note={`${completed} of ${assignments.length} assignments`} />
        <Stat label="Overdue" value={overdue.length} note={overdueSentence} />
        <Stat label="Learners" value={people.length} />
        <Stat label="Published courses" value={courses.filter((c) => c.status === "published").length} />
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <SectionTitle>Completion by team</SectionTitle>
          <ul className="space-y-5">
            {teams.map((t) => (
              <li key={t.team}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{t.team}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.done}/{t.total} · {t.pct}%
                  </span>
                </div>
                <div className="h-6 w-full rounded-[2px] bg-secondary">
                  <div className="h-full rounded-[2px] bg-tsd-slate" style={{ width: `${t.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <SectionTitle>Where training is overdue</SectionTitle>
          {byCategory.size === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is overdue.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {[...byCategory.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([cat, n]) => (
                  <li key={cat} className="flex justify-between py-3 text-sm">
                    <span>{cat}</span>
                    <span className="tabular-nums font-medium">{n}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-12">
        <SectionTitle>People</SectionTitle>
        <div className="overflow-x-auto rounded-[4px] bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Overdue</th>
                <th className="w-48 px-4 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {perPerson.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.title}</p>
                  </td>
                  <td className="px-4 py-3">{p.team}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {p.done} of {p.total}
                  </td>
                  <td className={`px-4 py-3 tabular-nums ${p.overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                    {p.overdue}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={p.pct} />
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{p.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  );
}
