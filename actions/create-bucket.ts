import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Create a training bucket, optionally with an ordered list of course ids.",
  schema: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    audience: z.string().optional(),
    courseIds: z.array(z.string()).optional(),
  }),
  authorize: async () => {
    await requireCapability("manage-buckets");
  },
  run: async ({ courseIds, ...input }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(schema.buckets)
      .values({ id, ...input, name: input.name.trim() })
      .returning();
    if (courseIds?.length) {
      await db.insert(schema.bucketCourses).values(
        courseIds.map((courseId, position) => ({ id: crypto.randomUUID(), bucketId: id, courseId, position })),
      );
    }
    return row;
  },
});
