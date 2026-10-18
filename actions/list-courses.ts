import { defineAction } from "@agent-native/core/action";
import { asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { can } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "List courses. Drafts are only included for course administrators.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const me = await getCurrentPerson();
    const db = getDb();
    const q = db.select().from(schema.courses);
    const [courses, counts] = await Promise.all([
      (can(me.role, "manage-courses") ? q : q.where(eq(schema.courses.status, "published"))).orderBy(
        asc(schema.courses.title),
      ),
      db
        .select({ courseId: schema.courseResources.courseId, n: count() })
        .from(schema.courseResources)
        .groupBy(schema.courseResources.courseId),
    ]);
    const byCourse = new Map(counts.map((c) => [c.courseId, Number(c.n)]));
    return courses.map((c) => ({ ...c, resourceCount: byCourse.get(c.id) ?? 0 }));
  },
});
