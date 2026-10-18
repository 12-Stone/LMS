import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Update a course's details or publish status.",
  schema: z.object({
    id: z.string(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    difficulty: z.enum(["Foundation", "Intermediate", "Advanced"]).optional(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    format: z.string().optional(),
    status: z.enum(["published", "draft"]).optional(),
  }),
  authorize: async () => {
    await requireCapability("manage-courses");
  },
  run: async ({ id, ...patch }) => {
    const [row] = await getDb()
      .update(schema.courses)
      .set(patch)
      .where(eq(schema.courses.id, id))
      .returning();
    return row;
  },
});
