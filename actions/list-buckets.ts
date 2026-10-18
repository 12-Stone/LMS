import { defineAction } from "@agent-native/core/action";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { can } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description:
    "List training buckets with ordered course ids and assignee counts. Learners only see buckets assigned to them.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const me = await getCurrentPerson();
    const db = getDb();
    const [buckets, links, assigns] = await Promise.all([
      db.select().from(schema.buckets).orderBy(asc(schema.buckets.createdAt), asc(schema.buckets.name)),
      db.select().from(schema.bucketCourses).orderBy(asc(schema.bucketCourses.position)),
      db.select({ bucketId: schema.assignments.bucketId, personId: schema.assignments.personId }).from(schema.assignments),
    ]);
    const visible = can(me.role, "manage-buckets")
      ? buckets
      : buckets.filter((b) => assigns.some((a) => a.bucketId === b.id && a.personId === me.id));
    return visible.map((b) => ({
      ...b,
      courseIds: links.filter((l) => l.bucketId === b.id).map((l) => l.courseId),
      assigneeCount: new Set(assigns.filter((a) => a.bucketId === b.id).map((a) => a.personId)).size,
    }));
  },
});
