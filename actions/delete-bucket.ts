import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Delete a training bucket. Existing course assignments are kept.",
  schema: z.object({ id: z.string() }),
  http: { method: "DELETE" },
  authorize: async () => {
    await requireCapability("manage-buckets");
  },
  run: async ({ id }) => {
    const db = getDb();
    await db.delete(schema.bucketCourses).where(eq(schema.bucketCourses.bucketId, id));
    const [row] = await db.delete(schema.buckets).where(eq(schema.buckets.id, id)).returning();
    return row;
  },
});
