#!/usr/bin/env node

const deploymentId = process.argv[2]?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = (process.env.CLOUDFLARE_API_TOKEN || process.env.WRANGLER_TOKEN)?.trim();
const projectName = (process.env.CLOUDFLARE_PAGES_PROJECT || "cambiometro").trim();

if (!deploymentId) throw new Error("PAGES_ROLLBACK_USAGE: npm run pages:rollback -- <deployment-id>");
if (!accountId || !token) throw new Error("PAGES_ROLLBACK_AUTH: define CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN/WRANGLER_TOKEN");
if (process.env.CONFIRM_PAGES_ROLLBACK !== "1") {
  throw new Error("PAGES_ROLLBACK_CONFIRM: define CONFIRM_PAGES_ROLLBACK=1 para ejecutar una reversión de producción");
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments/${encodeURIComponent(deploymentId)}/rollback`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});
const payload = await response.json().catch(() => null);
if (!response.ok || payload?.success !== true) {
  throw new Error(`PAGES_ROLLBACK_FAILED: HTTP ${response.status} ${JSON.stringify(payload?.errors ?? payload)}`);
}

console.log(JSON.stringify({
  ok: true,
  projectName,
  requestedDeploymentId: deploymentId,
  deployment: payload.result ?? null,
}, null, 2));
