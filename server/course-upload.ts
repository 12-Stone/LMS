import { fail } from "@agent-native/core/action";
import { and, eq, isNull } from "drizzle-orm";
import { requireCapability } from "./access";
import { courseStorageScope, readCourseStorage } from "./course-storage";
import { getDb, schema } from "./db";

export async function ownedCourseUpload(id: string) {
  await requireCapability("manage-courses");
  const scope = courseStorageScope();
  const [file] = await getDb().select().from(schema.privateCourseFiles).where(and(
    eq(schema.privateCourseFiles.id, id),
    eq(schema.privateCourseFiles.ownerEmail, scope.email),
    scope.orgId ? eq(schema.privateCourseFiles.orgId, scope.orgId) : isNull(schema.privateCourseFiles.orgId),
  ));
  if (!file) fail("Upload not found.", { statusCode: 404 });
  const config = await readCourseStorage(file.storageScopeId);
  if (!config || config.endpoint !== file.endpoint || config.bucket !== file.bucket) {
    fail("The storage connection changed. Restore the original connection or start a new upload.", { statusCode: 409 });
  }
  return { file, config };
}
