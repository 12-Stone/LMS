import { defineAction } from "@agent-native/core/action";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { can, isAdminEmail } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "List people and their teams and roles. Learners only see themselves.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const me = await getCurrentPerson();
    if (!can(me.role, "view-team")) return [me];
    const rows = await getDb().select().from(schema.people).orderBy(asc(schema.people.name));
    return rows.map((p) => ({
      ...p,
      role: isAdminEmail(p.email) ? "admin" : p.role === "admin" ? "manager" : p.role,
    }));
  },
});
