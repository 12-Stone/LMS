import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { can } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Update progress (0-100) on one of your assignments. 100 marks it completed.",
  schema: z.object({ id: z.string(), progress: z.coerce.number().int().min(0).max(100) }),
  run: async ({ id, progress }) => {
    const me = await getCurrentPerson();
    const db = getDb();
    const [current] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, id));
    if (!current) fail("Assignment not found.");
    if (current.personId !== me.id && !can(me.role, "manage-people")) fail("You can only update your own training.");
    const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started";
    const [row] = await db
      .update(schema.assignments)
      .set({ progress, status, completedAt: progress >= 100 ? new Date().toISOString().slice(0, 10) : null })
      .where(eq(schema.assignments.id, id))
      .returning();
    return row;
  },
});
