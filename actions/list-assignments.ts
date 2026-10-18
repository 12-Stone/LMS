import { defineAction } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { can } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description:
    "List training assignments. Pass personId \"me\" for the caller's own. Learners always get only their own.",
  schema: z.object({ personId: z.string().optional() }),
  http: { method: "GET" },
  run: async ({ personId }) => {
    const me = await getCurrentPerson();
    const target = !can(me.role, "view-team") || personId === "me" ? me.id : personId;
    const q = getDb().select().from(schema.assignments);
    return (target ? q.where(eq(schema.assignments.personId, target)) : q).orderBy(asc(schema.assignments.dueDate));
  },
});
