import { defineAction, fail } from "@agent-native/core/action";
import { and, asc, eq, isNull } from "drizzle-orm";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { COURSE_UPLOAD_CHUNK_BYTES, MAX_COURSE_FILE_BYTES } from "../app/lib/course-upload-limits";
import { requireCapability } from "../server/access";
import { courseStorageRequest, courseStorageScope, readCourseStorage, requireStorageResponse } from "../server/course-storage";
import { ownedCourseUpload } from "../server/course-upload";
import { getDb, schema } from "../server/db";

const input = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("start"),
    filename: z.string().trim().min(1).max(255).describe("Original file name."),
    mimeType: z.string().min(1).max(200).regex(/^[\w.+-]+\/[\w.+-]+$/).describe("File MIME type, or application/octet-stream."),
    sizeBytes: z.number().int().min(0).max(MAX_COURSE_FILE_BYTES).describe("Exact file size in bytes, at most 5 GiB."),
  }),
  z.object({ operation: z.literal("complete"), id: z.string().uuid().describe("Upload id returned by start.") }),
  z.object({ operation: z.literal("abort"), id: z.string().uuid().describe("Upload id returned by start.") }),
]);
const parser = new XMLParser({ parseTagValue: false, processEntities: false });
const result = (id: string, complete = false) => ({ id, chunkBytes: COURSE_UPLOAD_CHUNK_BYTES, url: complete ? `/api/course-files/${id}` : null });

export default defineAction({
  description: "Start, complete, or abort a private course-file upload. Start takes filename, MIME type, and size up to 5 GiB; upload numbered 5 MiB binary chunks before complete. Only the uploader can manage a session.",
  schema: input,
  authorize: async () => { await requireCapability("manage-courses"); },
  run: async (args) => {
    const db = getDb();
    if (args.operation === "start") {
      const scope = courseStorageScope();
      const config = await readCourseStorage(scope.scopeId);
      if (!config) fail("Connect and verify private R2 storage first.", { statusCode: 503 });
      const id = crypto.randomUUID();
      const response = await courseStorageRequest(config, `course-files/${id}`, "POST", {
        query: { uploads: "" }, mimeType: args.mimeType,
      });
      requireStorageResponse(response);
      const initiated = z.object({ InitiateMultipartUploadResult: z.object({ UploadId: z.string().min(1).max(2048) }) })
        .safeParse(parser.parse(await response.text()));
      if (!initiated.success) fail("R2 couldn't start the multipart upload. Try again.", { statusCode: 502 });
      const uploadId = initiated.data.InitiateMultipartUploadResult.UploadId;
      try {
        await db.insert(schema.privateCourseFiles).values({
          id, ownerEmail: scope.email, orgId: scope.orgId, storageScopeId: scope.scopeId,
          endpoint: config.endpoint, bucket: config.bucket, name: args.filename,
          mimeType: args.mimeType, sizeBytes: args.sizeBytes, uploadId, uploadState: "uploading",
        });
      } catch (error) {
        await courseStorageRequest(config, `course-files/${id}`, "DELETE", { query: { uploadId } }).then((r) => r.body?.cancel()).catch(() => {});
        throw error;
      }
      return result(id);
    }
    const { file, config } = await ownedCourseUpload(args.id);
    const key = `course-files/${file.id}`;
    if (args.operation === "abort") {
      if (file.courseId) fail("An imported course file cannot be cancelled.", { statusCode: 409 });
      if (file.uploadState === "aborted") return result(file.id);
      if (file.uploadState === "completing") fail("The file is being finalized. Retry cancellation shortly.", { statusCode: 409 });
      const claimed = await db.update(schema.privateCourseFiles).set({ uploadState: "aborting" }).where(and(
        eq(schema.privateCourseFiles.id, file.id), eq(schema.privateCourseFiles.uploadState, file.uploadState), isNull(schema.privateCourseFiles.courseId),
      )).returning({ id: schema.privateCourseFiles.id });
      if (!claimed.length) fail("The upload changed. Retry cancellation.", { statusCode: 409 });
      try {
        const cleanup = file.uploadState === "complete"
          ? await courseStorageRequest(config, key, "DELETE")
          : await courseStorageRequest(config, key, "DELETE", { query: { uploadId: file.uploadId! } });
        if (cleanup.status !== 404) requireStorageResponse(cleanup);
        await cleanup.body?.cancel();
        await db.update(schema.privateCourseFiles).set({ uploadState: "aborted" }).where(eq(schema.privateCourseFiles.id, file.id));
        return result(file.id);
      } catch (error) {
        await db.update(schema.privateCourseFiles).set({ uploadState: file.uploadState }).where(eq(schema.privateCourseFiles.id, file.id));
        throw error;
      }
    }
    if (file.uploadState === "complete") return result(file.id, true);
    if (file.uploadState !== "uploading" || !file.uploadId) fail("This upload is not ready to complete.", { statusCode: 409 });
    const parts = await db.select().from(schema.courseUploadParts).where(eq(schema.courseUploadParts.fileId, file.id))
      .orderBy(asc(schema.courseUploadParts.partNumber));
    const expectedCount = Math.max(1, Math.ceil(file.sizeBytes / COURSE_UPLOAD_CHUNK_BYTES));
    if (parts.length !== expectedCount || parts.some((part, index) =>
      part.partNumber !== index + 1 || part.sizeBytes !== Math.min(COURSE_UPLOAD_CHUNK_BYTES, Math.max(0, file.sizeBytes - index * COURSE_UPLOAD_CHUNK_BYTES))
    )) fail("Some file chunks are missing. Upload all chunks before completing.", { statusCode: 409 });
    const claimed = await db.update(schema.privateCourseFiles).set({ uploadState: "completing" })
      .where(and(eq(schema.privateCourseFiles.id, file.id), eq(schema.privateCourseFiles.uploadState, "uploading"))).returning({ id: schema.privateCourseFiles.id });
    if (!claimed.length) fail("This upload is already being finalized.", { statusCode: 409 });
    try {
      const xml = new XMLBuilder().build({ CompleteMultipartUpload: { Part: parts.map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })) } });
      const completed = await courseStorageRequest(config, key, "POST", {
        query: { uploadId: file.uploadId }, mimeType: "application/xml", data: new TextEncoder().encode(xml),
      });
      const body = await completed.text();
      if (!completed.ok || !body.includes("CompleteMultipartUploadResult")) {
        const head = await courseStorageRequest(config, key, "HEAD");
        if (!head.ok || Number(head.headers.get("content-length")) !== file.sizeBytes) {
          fail("R2 couldn't finalize the upload. Retry the file.", { statusCode: 502 });
        }
      }
      await db.update(schema.privateCourseFiles).set({ uploadState: "complete" }).where(eq(schema.privateCourseFiles.id, file.id));
      return result(file.id, true);
    } catch (error) {
      await db.update(schema.privateCourseFiles).set({ uploadState: "uploading" }).where(eq(schema.privateCourseFiles.id, file.id));
      throw error;
    }
  },
});
