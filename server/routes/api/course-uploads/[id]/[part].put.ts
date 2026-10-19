import { assertBodySize, createError, defineEventHandler, getRouterParam } from "h3";
import { getSession } from "@agent-native/core/server";
import { runWithRequestContext } from "@agent-native/core/server/request-context";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { COURSE_UPLOAD_CHUNK_BYTES } from "../../../../../app/lib/course-upload-limits";
import { courseStorageRequest, requireStorageResponse } from "../../../../course-storage";
import { ownedCourseUpload } from "../../../../course-upload";
import { getDb, schema } from "../../../../db";

export default defineEventHandler(async (event) => {
  const session = await getSession(event);
  if (!session) throw createError({ statusCode: 401, statusMessage: "Sign in required" });
  return runWithRequestContext({ userEmail: session.email, userName: session.name, orgId: session.orgId }, async () => {
    const parsed = z.object({ id: z.string().uuid(), part: z.coerce.number().int().min(1).max(10000) })
      .safeParse({ id: getRouterParam(event, "id"), part: getRouterParam(event, "part") });
    if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid upload chunk" });
    const { id, part } = parsed.data;
    const { file, config } = await ownedCourseUpload(id);
    if (file.uploadState !== "uploading" || !file.uploadId) throw createError({ statusCode: 409, statusMessage: "Upload is not accepting chunks" });
    const partCount = Math.max(1, Math.ceil(file.sizeBytes / COURSE_UPLOAD_CHUNK_BYTES));
    if (part > partCount) throw createError({ statusCode: 400, statusMessage: "Unexpected upload chunk" });
    assertBodySize(event, COURSE_UPLOAD_CHUNK_BYTES);
    const bytes = new Uint8Array(await event.req.arrayBuffer());
    const expected = Math.min(COURSE_UPLOAD_CHUNK_BYTES, Math.max(0, file.sizeBytes - (part - 1) * COURSE_UPLOAD_CHUNK_BYTES));
    if (bytes.byteLength !== expected) throw createError({ statusCode: 400, statusMessage: "Upload chunk size does not match the file" });
    const uploaded = await courseStorageRequest(config, `course-files/${id}`, "PUT", {
      query: { uploadId: file.uploadId, partNumber: String(part) }, data: bytes,
    });
    requireStorageResponse(uploaded);
    const etag = uploaded.headers.get("etag");
    await uploaded.body?.cancel();
    if (!etag) throw createError({ statusCode: 502, statusMessage: "R2 did not confirm the upload chunk" });
    const [current] = await getDb().select({ state: schema.privateCourseFiles.uploadState }).from(schema.privateCourseFiles).where(eq(schema.privateCourseFiles.id, id));
    if (current?.state !== "uploading") throw createError({ statusCode: 409, statusMessage: "Upload was cancelled or finalized" });
    await getDb().insert(schema.courseUploadParts).values({ fileId: id, partNumber: part, etag, sizeBytes: bytes.byteLength })
      .onConflictDoUpdate({ target: [schema.courseUploadParts.fileId, schema.courseUploadParts.partNumber], set: { etag, sizeBytes: bytes.byteLength } });
    return { ok: true };
  });
});
