import { defineAction, fail } from "@agent-native/core/action";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { ASSIGNABLE_ROLES, isAdminEmail } from "../app/lib/permissions";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description:
    "Add a person by email. Only added people can activate an account and sign in. Roles: learner or manager.",
  schema: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    title: z.string().optional(),
    team: z.string().min(1),
    role: z.enum(ASSIGNABLE_ROLES),
  }),
  authorize: async () => {
    await requireCapability("manage-people");
  },
  run: async (input) => {
    const db = getDb();
    const email = input.email.trim().toLowerCase();
    if (isAdminEmail(email)) fail("That email is the administrator account.");
    const [dupe] = await db.select().from(schema.people).where(sql`lower(${schema.people.email}) = ${email}`);
    if (dupe) fail(`${email} is already in the directory.`);
    const [row] = await db
      .insert(schema.people)
      .values({ id: crypto.randomUUID(), ...input, email, title: input.title ?? "" })
      .returning();
    return row;
  },
});
