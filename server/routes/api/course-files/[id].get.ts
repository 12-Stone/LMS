import { defineEventHandler, createError, getHeader, getRouterParam } from "h3";
import { getSession } from "@agent-native/core/server";
import { runWithRequestContext } from "@agent-native/core/server/request-context";
import { and, eq } from "drizzle-orm";
import { can } from "../../../../app/lib/permissions";
import { getCurrentPerson } from "../../../access";
import { courseStorageRequest, readCourseStorage, requireStorageResponse } from "../../../course-storage";
import { getDb, schema } from "../../../db";

export default defineEventHandler(async (event) => {
  const session = await getSession(event);
  if (!session) throw createError({ statusCode: 401, statusMessage: "Sign in required" });
  return runWithRequestContext({ userEmail: session.email, orgId: session.orgId, userName: session.name }, async () => {
    const person = await getCurrentPerson();
    const id = getRouterParam(event, "id");
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw createError({ statusCode: 404 });
    const [record] = await getDb()
      .select({ file: schema.privateCourseFiles, course: schema.courses })
      .from(schema.privateCourseFiles)
      .innerJoin(schema.courses, eq(schema.privateCourseFiles.courseId, schema.courses.id))
      .innerJoin(schema.courseResources, and(
        eq(schema.courseResources.courseId, schema.courses.id),
        eq(schema.courseResources.url, `/api/course-files/${id}`),
      ))
      .where(eq(schema.privateCourseFiles.id, id));
    if (
      !record || (record.file.orgId ?? null) !== (session.orgId ?? null) ||
      (record.course.status !== "published" && !can(person.role, "manage-courses"))
    ) throw createError({ statusCode: 404, statusMessage: "File not found" });
    // Only the authorized parent resource may select the upload's vault scope.
    const config = await readCourseStorage(record.file.storageScopeId);
    if (!config || config.endpoint !== record.file.endpoint || config.bucket !== record.file.bucket) {
      throw createError({ statusCode: 503, statusMessage: "Course storage is unavailable" });
    }
    const range = getHeader(event, "range");
    if (range && !/^bytes=\d*-\d*$/.test(range)) throw createError({ statusCode: 416 });
    const upstream = await courseStorageRequest(config, `course-files/${id}`, "GET", { range });
    if (upstream.status === 416) return new Response(null, { status: 416 });
    requireStorageResponse(upstream);
    const filename = record.file.name.replace(/[\r\n"\\]/g, "_");
    const headers = new Headers({
      "Content-Type": record.file.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    });
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  });
});
