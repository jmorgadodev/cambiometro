const PROJECT_NAME = "cambiometro";
const API_BASE = "https://api.cloudflare.com/client/v4";

export function validateDeploymentId(deploymentId) {
  if (!deploymentId || !/^[a-zA-Z0-9_-]+$/.test(deploymentId)) {
    throw new Error("Uso: npm run pages:rollback -- <deployment-id>");
  }
  return deploymentId;
}

export function buildRollbackRequest({ accountId, token, deploymentId }) {
  validateDeploymentId(deploymentId);
  if (!accountId) throw new Error("Falta CLOUDFLARE_ACCOUNT_ID.");
  if (!token) throw new Error("Falta CLOUDFLARE_API_TOKEN.");

  return {
    url: `${API_BASE}/accounts/${encodeURIComponent(accountId)}/pages/projects/${PROJECT_NAME}/deployments/${encodeURIComponent(deploymentId)}/rollback`,
    options: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    },
  };
}

export async function rollbackDeployment({ accountId, token, deploymentId, fetchImpl = fetch }) {
  const request = buildRollbackRequest({ accountId, token, deploymentId });
  const response = await fetchImpl(request.url, request.options);
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    const details = payload?.errors?.map((error) => error.message).filter(Boolean).join("; ") || `HTTP ${response.status}`;
    throw new Error(`Rollback Pages fallido: ${details}`);
  }
  return payload.result;
}

if (process.argv[1]?.endsWith("pages-rollback.mjs")) {
  const deploymentId = validateDeploymentId(process.argv[2]);
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.WRANGLER_TOKEN;
  rollbackDeployment({ accountId, token, deploymentId })
    .then((deployment) => {
      console.log(`Pages revertido al deployment ${deployment?.id || deploymentId}.`);
      if (deployment?.url) console.log(`URL: ${deployment.url}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
