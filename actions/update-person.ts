import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ASSIGNABLE_ROLES, isAdminEmail } from "../app/lib/permissions";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Change a person's role (learner or manager), team, or title. The administrator account can't be changed.",
  schema: z.object({
    id: z.string(),
    role: z.enum(ASSIGNABLE_ROLES).optional(),
    team: z.string().min(1).optional(),
    title: z.string().optional(),
  }),
  authorize: async () => {
    await requireCapability("manage-people");
  },
  run: async ({ id, ...patch }) => {
    const db = getDb();
    const [person] = await db.select().from(schema.people).where(eq(schema.people.id, id));
    if (!person) fail("Person not found.");
    if (isAdminEmail(person.email) && patch.role) fail("The administrator's role can't be changed.");
    const [row] = await db.update(schema.people).set(patch).where(eq(schema.people.id, id)).returning();
    return row;
  },
});
