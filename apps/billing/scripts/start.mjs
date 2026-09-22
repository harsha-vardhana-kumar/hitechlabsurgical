import { access, cp } from "node:fs/promises";
const app = new URL("../", import.meta.url),
  standalone = new URL(".next/standalone/apps/billing/", app),
  server = new URL("server.js", standalone);
try {
  await access(server);
} catch {
  console.error("Run the billing production build first.");
  process.exit(1);
}
await cp(new URL("public/", app), new URL("public/", standalone), {
  recursive: true,
});
await cp(new URL(".next/static/", app), new URL(".next/static/", standalone), {
  recursive: true,
});
process.env.HOSTNAME = "0.0.0.0";
await import(server.href);
