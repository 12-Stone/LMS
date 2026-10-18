# Twelve Stone Academy

Twelve Stone Academy is the team's training and development hub, with courses, assignments, knowledge resources, and bulk course imports. Course files can be stored in a private Cloudflare R2 bucket and downloaded through authenticated app routes.

## Develop locally

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm dev
```

`pnpm dev` skips sign-in for local preview only. Production uses the invite-only login flow. Do not expose the development preview when testing private course data.

Apply app migrations with `pnpm db:migrate`. Connect course storage in Bulk Import Studio using the shared storage form: choose Cloudflare R2, enter the S3 endpoint, bucket, and bucket-scoped Object Read & Write credentials, use region `auto`, and leave Public URL blank. Keep public bucket access disabled. Verify connection before importing. Each file is limited to 25 MB; larger files are skipped. Credentials are workspace-scoped, so configure them again under the production administrator or organization rather than copying development secrets.

## Project layout

- `app/`: routes and UI components
- `actions/`: operations shared by the UI and the app's agent
- `server/`: server plugins and the database client
- `drizzle/`: schema and migrations; start with `drizzle/START_HERE.md`

Framework docs: [agent-native.com/docs](https://agent-native.com/docs?utm_source=github&utm_medium=referral&utm_content=fusion-starter-readme).
