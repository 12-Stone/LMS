import { fail } from "@agent-native/core/action";
import { getRequestUserEmail, getRequestUserName } from "@agent-native/core/server/request-context";
import { eq, sql } from "drizzle-orm";

import { ADMIN_EMAIL, can, isAdminEmail, type Capability } from "../app/lib/permissions";
import { getDb, schema } from "./db";

export type Person = typeof schema.people.$inferSelect;

export async function findPersonByEmail(email: string) {
  const [row] = await getDb()
    .select()
    .from(schema.people)
    .where(sql`lower(${schema.people.email}) = ${email.trim().toLowerCase()}`);
  return row;
}

export async function isInvitedEmail(email: string) {
  return isAdminEmail(email) || !!(await findPersonByEmail(email));
}

// Only ADMIN_EMAIL is an administrator. Everyone else must have been added
// to People by the admin; unknown accounts get no access at all.
export async function getCurrentPerson(): Promise<Person> {
  const email = getRequestUserEmail()?.trim().toLowerCase();
  if (!email) fail("Sign in required.");
  const db = getDb();
  const now = new Date().toISOString();
  let person = await findPersonByEmail(email);

  if (!person && isAdminEmail(email)) {
    [person] = await db
      .insert(schema.people)
      .values({
        id: crypto.randomUUID(),
        name: getRequestUserName()?.trim() || "Administrator",
        email: ADMIN_EMAIL,
        team: "Leadership",
        role: "admin",
        lastSeenAt: now,
      })
      .returning();
  }
  if (!person) fail("Your account hasn't been set up. Ask your administrator to add you to the Academy.");

  if (!person.lastSeenAt) {
    await db.update(schema.people).set({ lastSeenAt: now }).where(eq(schema.people.id, person.id));
  }
  const role = isAdminEmail(email) ? "admin" : person.role === "admin" ? "manager" : person.role;
  return { ...person, role, lastSeenAt: person.lastSeenAt ?? now };
}

export async function requireCapability(cap: Capability) {
  const me = await getCurrentPerson();
  if (!can(me.role, cap)) fail("You don't have permission to do this.");
  return me;
}
