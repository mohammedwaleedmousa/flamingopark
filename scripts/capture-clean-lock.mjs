import { execFileSync } from "node:child_process";

execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts"], { stdio: "inherit" });

const changed = execFileSync("git", ["status", "--porcelain", "--", "package-lock.json"], { encoding: "utf8" }).trim();
if (!changed) {
  console.log("package-lock.json is already clean");
  process.exit(0);
}

execFileSync("git", ["config", "user.name", "cloudflare-pages[bot]"], { stdio: "inherit" });
execFileSync("git", ["config", "user.email", "cloudflare-pages[bot]@users.noreply.github.com"], { stdio: "inherit" });
execFileSync("git", ["add", "package-lock.json"], { stdio: "inherit" });
execFileSync("git", ["commit", "-m", "chore: regenerate lockfile without Vercel"], { stdio: "inherit" });
execFileSync("git", ["push", "origin", "HEAD:chore/remove-vercel"], { stdio: "inherit" });
