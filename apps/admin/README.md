# Hitech Admin

From the repository root, run `npm ci` and `npm run dev:admin -- --port 3002`. The app opens a labelled Demo Workspace. Its product and content publication can be inspected under **System → Publishing status**. A fresh browser profile gives an independent sample workspace.

| Root command | Purpose |
| --- | --- |
| `npm run build:admin` | Independent production build |
| `npm run start --workspace @hitech/admin` | Run standalone production output |
| `npm test --workspace @hitech/admin` | Admin domain and adapter tests |
| `npm run check` | Lint, type-check, unit-test and build all apps |
| `npx playwright install chromium` then `npm run test:admin:browser` | Run the Chromium Admin scenarios after the three builds |

For Vercel, import the same repository as a separate Next.js project. Root Directory is **apps/admin**. Enable source files outside the root, select Node 22, use `npm ci --prefix ../..` for install, `npm run build` for build and the default output directory. The included `vercel.json` specifies the install and build commands. A preview needs no secrets.

The names-only example lists optional configuration. `HITECH_WORKSPACE_STAGE=production` disables demo startup. A non-demo `NEXT_PUBLIC_ADMIN_MODE` also displays the setup-required state. Reserved API URL, Cognito region, pool and client IDs do not activate a backend.

[Architecture](../../docs/admin-architecture.md) · [Release checks](../../docs/production-readiness.md) · [Future AWS integration](../../docs/aws-readiness.md)
