import { defineAction } from "@agent-native/core/action";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description:
    "Assign every course in a training bucket to the given people. Skips courses a person already has.",
  schema: z.object({
    bucketId: z.string(),
    personIds: z.array(z.string()).min(1),
    dueDate: z.string().optional(),
    required: z.boolean().optional(),
  }),
  authorize: async () => {
    await requireCapability("manage-buckets");
  },
  run: async ({ bucketId, personIds, dueDate, required }) => {
    const db = getDb();
    const links = await db.select().from(schema.bucketCourses).where(eq(schema.bucketCourses.bucketId, bucketId));
    const courseIds = links.map((l) => l.courseId);
    if (!courseIds.length) return { created: 0 };
    const existing = await db
      .select({ personId: schema.assignments.personId, courseId: schema.assignments.courseId })
      .from(schema.assignments)
      .where(and(inArray(schema.assignments.personId, personIds), inArray(schema.assignments.courseId, courseIds)));
    const have = new Set(existing.map((e) => `${e.personId}:${e.courseId}`));
    const rows = personIds.flatMap((personId) =>
      courseIds
        .filter((courseId) => !have.has(`${personId}:${courseId}`))
        .map((courseId) => ({
          id: crypto.randomUUID(),
          personId,
          courseId,
          bucketId,
          dueDate: dueDate || null,
          required: required === false ? 0 : 1,
        })),
    );
    if (rows.length) await db.insert(schema.assignments).values(rows);
    return { created: rows.length };
  },
});
