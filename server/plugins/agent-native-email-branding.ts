import { defineAppConfig } from "@agent-native/core/server";

export default defineAppConfig({
  app: {
    // This name appears in transactional emails. Change it to your product name.
    name: "Twelve Stone Academy",
    // The source template keeps a renamed app from inheriting first-party email branding.
    sourceTemplate: "builder-code-starter",
    // Keep the template's authenticated entry explicit after renaming the app.
    homePath: "/",
    // Optional: use your own absolute HTTPS logo URL in transactional emails.
    logoUrl:
      "https://cdn.builder.io/api/v1/image/assets%2F6a86dc2ea12441c896975357926a568c%2F4d7566ca72bd4425ad75347e994bc852?format=png&width=600",
  },
});
