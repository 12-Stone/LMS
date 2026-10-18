import { fail } from "@agent-native/core/action";
import { registerFileUploadProvider } from "@agent-native/core/file-upload";
import { defineNitroPlugin } from "@agent-native/core/server";
import { requireCapability } from "../access";
import { courseStorageRequest, courseStorageScope, MAX_COURSE_FILE_BYTES, readCourseStorage, requireStorageResponse } from "../course-storage";
import { getDb, schema } from "../db";

export default defineNitroPlugin(() => {
  registerFileUploadProvider({
    id: "s3",
    name: "Private Cloudflare R2",
    publicBaseUrlOptional: true,
    isConfigured: () => false,
    isConfiguredForRequest: async () => !!(await readCourseStorage(courseStorageScope().scopeId)),
    upload: async ({ data, filename, mimeType }) => {
      await requireCapability("manage-courses");
      if (data.byteLength > MAX_COURSE_FILE_BYTES) fail("Course files must be 25 MB or smaller.", { statusCode: 413 });
      const scope = courseStorageScope();
      const config = await readCourseStorage(scope.scopeId);
      if (!config) fail("Connect your private R2 bucket in Bulk Import Studio first.", { statusCode: 503 });
      const id = crypto.randomUUID();
      const type = mimeType || "application/octet-stream";
      const response = await courseStorageRequest(config, `course-files/${id}`, "PUT", { data, mimeType: type });
      requireStorageResponse(response);
      await response.body?.cancel();
      await getDb().insert(schema.privateCourseFiles).values({
        id,
        ownerEmail: scope.email,
        orgId: scope.orgId,
        storageScopeId: scope.scopeId,
        endpoint: config.endpoint,
        bucket: config.bucket,
        name: filename || "course-file",
        mimeType: type,
        sizeBytes: data.byteLength,
      });
      return { url: `/api/course-files/${id}`, id, provider: "s3" };
    },
  });
});
