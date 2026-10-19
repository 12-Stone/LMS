/**
 * See what the user is currently looking at on screen.
 *
 * Reads and returns the current navigation state from application state.
 *
 * Usage:
 *   pnpm action view-screen
 */

import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { courseStorageScope, MAX_COURSE_FILE_BYTES, readCourseStorage } from "../server/course-storage";

export default defineAction({
  description:
    "See what the user is currently looking at on screen. Returns the current navigation state for the app canvas plus agent rail. Always call this first before taking any action.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    if ((navigation as { view?: string } | null)?.view === "import") {
      await requireCapability("manage-courses");
      const storage = await readCourseStorage(courseStorageScope().scopeId);
      screen.courseStorage = { configured: !!storage, private: true, maxFileBytes: MAX_COURSE_FILE_BYTES };
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
