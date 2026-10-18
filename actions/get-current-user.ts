import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getCurrentPerson } from "../server/access";

export default defineAction({
  description: "Get the signed-in person's profile and role.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => getCurrentPerson(),
});
