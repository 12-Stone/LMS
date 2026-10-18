import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description:
    "Import many courses at once (Bulk Import Studio). Optionally add them all to a training bucket.",
  schema: z.object({
    courses: z
      .array(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.string().min(1),
          difficulty: z.enum(["Foundation", "Intermediate", "Advanced"]).optional(),
          durationMinutes: z.coerce.number().int().positive().optional(),
          format: z.string().optional(),
        }),
      )
      .min(1)
      .max(500),
    status: z.enum(["published", "draft"]).optional(),
    bucketId: z.string().optional(),
  }),
  authorize: async () => {
    await requireCapability("manage-courses");
  },
  run: async ({ courses, status, bucketId }) => {
    const db = getDb();
    const rows = courses.map((c) => ({
      id: crypto.randomUUID(),
      ...c,
      title: c.title.trim(),
      status: status ?? "draft",
      source: "import",
    }));
    await db.insert(schema.courses).values(rows);
    if (bucketId) {
      await db.insert(schema.bucketCourses).values(
        rows.map((r, i) => ({
          id: crypto.randomUUID(),
          bucketId,
          courseId: r.id,
          position: 1000 + i,
        })),
      );
    }
    return { imported: rows.length };
  },
});
