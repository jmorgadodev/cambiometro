import { execFileSync } from "node:child_process";

const deploymentId = process.argv[2];
if (!deploymentId || !/^[a-zA-Z0-9_-]+$/.test(deploymentId)) throw new Error("Uso: npm run pages:rollback -- <deployment-id>");
execFileSync("npx", ["wrangler", "pages", "deployment", "rollback", deploymentId, "--project-name", "cambiometro"], { stdio: "inherit" });
