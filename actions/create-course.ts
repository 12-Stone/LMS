import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Create a course in the Course Library.",
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.string().min(1),
    difficulty: z.enum(["Foundation", "Intermediate", "Advanced"]).optional(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    format: z.string().optional(),
    status: z.enum(["published", "draft"]).optional(),
  }),
  authorize: async () => {
    await requireCapability("manage-courses");
  },
  run: async (input) => {
    const [row] = await getDb()
      .insert(schema.courses)
      .values({ id: crypto.randomUUID(), ...input, title: input.title.trim() })
      .returning();
    return row;
  },
});
