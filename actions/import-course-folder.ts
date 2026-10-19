import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { courseStorageScope, PRIVATE_COURSE_FILE_URL } from "../server/course-storage";
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
          url: z.string().regex(PRIVATE_COURSE_FILE_URL, "Upload the file to private course storage first."),
        }),
      )
      .max(2000),
  }),
  authorize: async () => {
    await requireCapability("manage-courses");
  },
  run: async ({ resources, bucketId, status, ...course }) => {
    const scope = courseStorageScope();
    const fileIds = resources.map((r) => PRIVATE_COURSE_FILE_URL.exec(r.url)![1]);
    if (new Set(fileIds).size !== fileIds.length) fail("Each uploaded file can only be attached once.");
    return getDb().transaction(async (db) => {
      const id = crypto.randomUUID();
      const [row] = await db
        .insert(schema.courses)
        .values({ id, ...course, title: course.title.trim(), status: status ?? "draft", source: "folder" })
        .returning();
      if (resources.length) {
        const files = await db.update(schema.privateCourseFiles).set({ courseId: id }).where(and(
          inArray(schema.privateCourseFiles.id, fileIds),
          eq(schema.privateCourseFiles.ownerEmail, scope.email),
          scope.orgId ? eq(schema.privateCourseFiles.orgId, scope.orgId) : isNull(schema.privateCourseFiles.orgId),
          isNull(schema.privateCourseFiles.courseId),
          eq(schema.privateCourseFiles.uploadState, "complete"),
        )).returning();
        if (files.length !== fileIds.length) fail("Some files are unavailable or already attached. Upload them again before importing.");
        const byId = new Map(files.map((file) => [file.id, file]));
        await db.insert(schema.courseResources).values(resources.map((r, index) => {
          const file = byId.get(fileIds[index])!;
          return {
            ...r, id: crypto.randomUUID(), courseId: id,
            name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes,
          };
        }));
      }
      if (bucketId) {
        await db.insert(schema.bucketCourses)
          .values({ id: crypto.randomUUID(), bucketId, courseId: id, position: 1000 });
      }
      return { ...row, resourceCount: resources.length };
    });
  },
});
