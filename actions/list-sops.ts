import { defineAction } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { can } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "List SOPs. SOPs still in review are only shown to managers and admins.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const me = await getCurrentPerson();
    const q = getDb().select().from(schema.sops);
    return (can(me.role, "manage-sops") ? q : q.where(eq(schema.sops.status, "approved"))).orderBy(asc(schema.sops.title));
  },
});
