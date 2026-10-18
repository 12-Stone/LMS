import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Replace a bucket's course list with the given ordered course ids.",
  schema: z.object({ bucketId: z.string(), courseIds: z.array(z.string()) }),
  authorize: async () => {
    await requireCapability("manage-buckets");
  },
  run: async ({ bucketId, courseIds }) => {
    const db = getDb();
    await db.delete(schema.bucketCourses).where(eq(schema.bucketCourses.bucketId, bucketId));
    if (courseIds.length) {
      await db.insert(schema.bucketCourses).values(
        courseIds.map((courseId, position) => ({ id: crypto.randomUUID(), bucketId, courseId, position })),
      );
    }
    return { bucketId, count: courseIds.length };
  },
});
