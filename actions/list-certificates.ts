import { defineAction } from "@agent-native/core/action";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { can } from "../app/lib/permissions";
import { getCurrentPerson } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "List issued certificates. Learners only see their own.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const me = await getCurrentPerson();
    const q = getDb().select().from(schema.certificates);
    return (can(me.role, "view-team") ? q : q.where(eq(schema.certificates.personId, me.id))).orderBy(
      desc(schema.certificates.issuedAt),
    );
  },
});
