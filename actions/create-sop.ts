import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { requireCapability } from "../server/access";
import { getDb, schema } from "../server/db";

export default defineAction({
  description: "Create an SOP. New SOPs start in review until approved.",
  schema: z.object({
    title: z.string().min(1),
    category: z.string().min(1),
    owner: z.string().min(1),
    summary: z.string().optional(),
    body: z.string().optional(),
  }),
  authorize: async () => {
    await requireCapability("manage-sops");
  },
  run: async (input) => {
    const [row] = await getDb()
      .insert(schema.sops)
      .values({ id: crypto.randomUUID(), ...input, status: "in_review", updatedAt: new Date().toISOString().slice(0, 10) })
      .returning();
    return row;
  },
});
