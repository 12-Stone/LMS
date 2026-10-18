import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Delete a course and remove it from buckets and assignments.",
  schema: z.object({ id: z.string() }),
  http: { method: "DELETE" },
  authorize: async () => {
    await requireCapability("manage-courses");
  },
  run: async ({ id }) => {
    const db = getDb();
    await db.delete(schema.bucketCourses).where(eq(schema.bucketCourses.courseId, id));
    await db.delete(schema.courseResources).where(eq(schema.courseResources.courseId, id));
    await db.delete(schema.assignments).where(eq(schema.assignments.courseId, id));
    const [row] = await db.delete(schema.courses).where(eq(schema.courses.id, id)).returning();
    return row;
  },
});
