import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { courseStorageRequest, courseStorageScope, readCourseStorage, requireStorageResponse } from "../server/course-storage";

export default defineAction({
  description: "Verify the configured private Cloudflare R2 bucket with a temporary write, read, and delete. Never accepts or returns credentials.",
  schema: z.object({}),
  authorize: async () => { await requireCapability("manage-courses"); },
  run: async () => {
    const config = await readCourseStorage(courseStorageScope().scopeId);
    if (!config) fail("Save the R2 S3 API endpoint, bucket name, Access Key ID, and Secret Access Key first. Leave Public URL blank.");
    const key = `connection-checks/${crypto.randomUUID()}`;
    const marker = crypto.randomUUID();
    const write = await courseStorageRequest(config, key, "PUT", {
      data: new TextEncoder().encode(marker),
      mimeType: "text/plain",
    });
    requireStorageResponse(write);
    await write.body?.cancel();
    try {
      const read = await courseStorageRequest(config, key, "GET");
      requireStorageResponse(read);
      if (await read.text() !== marker) fail("R2 returned an unexpected connection check. Try again.");
    } finally {
      const cleanup = await courseStorageRequest(config, key, "DELETE");
      requireStorageResponse(cleanup);
      await cleanup.body?.cancel();
    }
    return { ok: true, message: "R2 write, read, and cleanup verified. Course files will be served through signed-in app access." };
  },
});
