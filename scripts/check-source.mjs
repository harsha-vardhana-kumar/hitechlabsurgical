import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Inspect tracked bytes only. Report paths and rule names without logging matches.
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const rules = [
  ["private key", /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
  ["AWS access key ID", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["GitHub access token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ["Slack token", /\bxox[baprs]-[\w-]{20,}/],
  ["service credential in URL", /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:/]+:[^\s/@]+@/i],
  ["assigned credential", /^\s*(?:AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|DATABASE_PASSWORD|SESSION_SECRET|GST_PORTAL_PASSWORD|API_SECRET)\s*=\s*["']?[A-Za-z0-9/+_=.-]{8,}/im],
];
const issues = [];
for (const file of files) {
  const leaf = file.split("/").at(-1);
  if ((leaf.startsWith(".env") && leaf !== ".env.example") ||
      /(?:^|\/)(?:node_modules|\.next|dist|test-results|playwright-report)(?:\/|$)/.test(file) ||
      /\.(?:pfx|p12|key|sql|sqlite|dump)$/i.test(file)) {
    issues.push(file + " contains a prohibited file type");
    continue;
  }
  const data = readFileSync(file);
  if (data.includes(0)) continue;
  const source = data.toString("utf8");
  for (const [name, pattern] of rules) {
    if (pattern.test(source)) issues.push(file + " matched " + name);
  }
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Tracked-source scan passed (" + files.length + " files).");
}
