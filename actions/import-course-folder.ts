import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description:
    "Create one course from an uploaded course folder, with its already-uploaded files attached as resources. Optionally add it to a training bucket.",
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.string().min(1),
    difficulty: z.enum(["Foundation", "Intermediate", "Advanced"]).optional(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    format: z.string().optional(),
    status: z.enum(["published", "draft"]).optional(),
    bucketId: z.string().optional(),
    resources: z
      .array(
        z.object({
          name: z.string().min(1),
          path: z.string().min(1),
          kind: z.string().optional(),
          mimeType: z.string().optional(),
          sizeBytes: z.coerce.number().int().nonnegative().optional(),
          url: z.string().url(),
        }),
      )
      .max(2000),
  }),
  authorize: async () => {
    await requireCapability("manage-courses");
  },
  run: async ({ resources, bucketId, status, ...course }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(schema.courses)
      .values({ id, ...course, title: course.title.trim(), status: status ?? "draft", source: "folder" })
      .returning();
    if (resources.length) {
      await db.insert(schema.courseResources).values(
        resources.map((r) => ({ id: crypto.randomUUID(), courseId: id, ...r })),
      );
    }
    if (bucketId) {
      await db
        .insert(schema.bucketCourses)
        .values({ id: crypto.randomUUID(), bucketId, courseId: id, position: 1000 });
    }
    return { ...row, resourceCount: resources.length };
  },
});
