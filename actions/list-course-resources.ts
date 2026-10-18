import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { can } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "List the files and resources attached to a course.",
  schema: z.object({ courseId: z.string() }),
  http: { method: "GET" },
  run: async ({ courseId }) => {
    const me = await getCurrentPerson();
    const db = getDb();
    const [course] = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId));
    if (!course || (course.status !== "published" && !can(me.role, "manage-courses"))) fail("Course not found.");
    return db
      .select()
      .from(schema.courseResources)
      .where(eq(schema.courseResources.courseId, courseId))
      .orderBy(asc(schema.courseResources.path));
  },
});
