import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isAdminEmail } from "../app/lib/permissions";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description:
    "Remove a person's access to the Academy and delete their assignments. Their issued certificates are kept.",
  schema: z.object({ id: z.string() }),
  http: { method: "DELETE" },
  authorize: async () => {
    await requireCapability("manage-people");
  },
  run: async ({ id }) => {
    const db = getDb();
    const [person] = await db.select().from(schema.people).where(eq(schema.people.id, id));
    if (!person) fail("Person not found.");
    if (isAdminEmail(person.email)) fail("The administrator account can't be removed.");
    await db.delete(schema.assignments).where(eq(schema.assignments.personId, id));
    const [row] = await db.delete(schema.people).where(eq(schema.people.id, id)).returning();
    return row;
  },
});
