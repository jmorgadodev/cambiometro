const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const uptimeToken = process.env.UPTIME_TOKEN?.trim();
const projectName = process.env.PAGES_PROJECT ?? "cambiometro";
const hostname = process.env.PAGES_HOSTNAME ?? "cambiometro.impulsacv.cl";
const zoneName = process.env.CLOUDFLARE_ZONE ?? "impulsacv.cl";
const pagesTarget = `${projectName}.pages.dev`;
const apply = process.argv.includes("--apply");

if (!accountId || !apiToken) throw new Error("CLOUDFLARE_CREDENTIALS_MISSING");
if (apply && process.env.CAMBIOMETRO_CUTOVER_CONFIRM !== "CAMBIOMETRO_CONFIRM_CUTOVER") {
  throw new Error("CUTOVER_CONFIRMATION_MISSING");
}

const apiBase = "https://api.cloudflare.com/client/v4";

async function cf(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success !== true) {
    const details = (body.errors ?? []).map((error) => error.message).join("; ");
    throw new Error(`CLOUDFLARE_API_FAILED:${response.status}:${details || path}`);
  }
  return body.result;
}

function printRecord(record) {
  console.log(JSON.stringify({
    id: record.id,
    type: record.type,
    name: record.name,
    content: record.content,
    proxied: record.proxied,
    ttl: record.ttl,
  }));
}

const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=50`);
const zone = zones.find((candidate) => candidate.name === zoneName);
if (!zone?.id) throw new Error(`CLOUDFLARE_ZONE_NOT_FOUND:${zoneName}`);

const deployments = await cf(`/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=20`);
const failedDeploymentStates = new Set(["failure", "failed", "error", "canceled", "cancelled"]);
const successfulDeploymentStates = new Set(["success", "successful", "successfully_deployed", "completed"]);
const productionDeployments = deployments
  .filter((deployment) => deployment.environment === "production" && deployment.is_skipped !== true && deployment.id)
  .sort((left, right) => String(right.created_on ?? "").localeCompare(String(left.created_on ?? "")));
const successfulProduction = productionDeployments.find((deployment) => {
  const stage = deployment.latest_stage ?? {};
  const states = [stage.name, stage.status, deployment.status, deployment.stage]
    .filter(Boolean)
    .map((state) => String(state).toLowerCase());
  const explicitlyFailed = states.some((state) => failedDeploymentStates.has(state));
  const completed = states.some((state) => successfulDeploymentStates.has(state)) || Boolean(stage.ended_on || deployment.completed_on);
  return !explicitlyFailed && (completed || states.length === 0);
});
if (!successfulProduction) {
  console.error(JSON.stringify({
    productionDeployments: productionDeployments.map((deployment) => ({
      id: deployment.id,
      environment: deployment.environment,
      status: deployment.status ?? null,
      stage: deployment.stage ?? null,
      latestStage: deployment.latest_stage ?? null,
      createdOn: deployment.created_on ?? null,
    })),
  }, null, 2));
  throw new Error("PAGES_PRODUCTION_DEPLOYMENT_NOT_VERIFIED");
}

// Pages custom-domain listing rejects per_page values above its API maximum.
// The project has a single production hostname, so the default first page is sufficient.
const domains = await cf(`/accounts/${accountId}/pages/projects/${projectName}/domains`);
const registeredDomain = domains.find((domain) => String(domain.name ?? "").toLowerCase() === hostname.toLowerCase());
const records = await cf(`/zones/${zone.id}/dns_records?name=${encodeURIComponent(hostname)}&per_page=100`);

console.log(JSON.stringify({
  mode: apply ? "apply" : "preflight",
  hostname,
  pagesTarget,
  zoneId: zone.id,
  pagesProductionDeployment: {
    id: successfulProduction.id,
    url: successfulProduction.url ?? null,
    createdOn: successfulProduction.created_on ?? null,
    status: successfulProduction.status ?? null,
    stage: successfulProduction.stage ?? null,
    latestStage: successfulProduction.latest_stage ?? null,
  },
  pagesDomainRegistered: Boolean(registeredDomain),
  dnsRecords: records.map((record) => ({ type: record.type, name: record.name, content: record.content, proxied: record.proxied })),
}, null, 2));

const desired = records.find((record) => record.type === "CNAME" && record.content.replace(/\.$/, "").toLowerCase() === pagesTarget);
const conflicting = records.filter((record) => record.type === "A" || record.type === "AAAA" || (record.type === "CNAME" && record.id !== desired?.id));

if (!apply) {
  console.log(JSON.stringify({
    action: "dry-run",
    wouldRegisterPagesDomain: !registeredDomain,
    wouldDeleteRecords: conflicting.map((record) => ({ id: record.id, type: record.type, content: record.content })),
    wouldCreateOrUpdateCname: !desired || desired.proxied !== true,
  }, null, 2));
  process.exit(0);
}

if (!registeredDomain) {
  const added = await cf(`/accounts/${accountId}/pages/projects/${projectName}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
  console.log(JSON.stringify({ action: "pages-domain-registered", name: added.name ?? hostname, status: added.status ?? null }));
}

for (const record of conflicting) {
  printRecord(record);
  await cf(`/zones/${zone.id}/dns_records/${record.id}`, { method: "DELETE" });
  console.log(JSON.stringify({ action: "dns-record-deleted", id: record.id, type: record.type }));
}

if (desired) {
  if (desired.proxied !== true) {
    await cf(`/zones/${zone.id}/dns_records/${desired.id}`, {
      method: "PATCH",
      body: JSON.stringify({ proxied: true, ttl: 1 }),
    });
    console.log(JSON.stringify({ action: "dns-cname-proxied", id: desired.id }));
  }
} else {
  const created = await cf(`/zones/${zone.id}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "CNAME",
      name: hostname,
      content: pagesTarget,
      ttl: 1,
      proxied: true,
      comment: "Cambiometro Pages static cutover",
    }),
  });
  console.log(JSON.stringify({ action: "dns-cname-created", id: created.id, content: created.content }));
}

const publicUrl = `https://${hostname}`;
const htmlResponse = await fetch(`${publicUrl}/?pages_cutover_probe=${Date.now()}`, {
  headers: { "User-Agent": "Cambiometro-Cutover/1.0" },
  signal: AbortSignal.timeout(20_000),
});
const html = await htmlResponse.text();
const csp = htmlResponse.headers.get("content-security-policy") ?? "";
if (htmlResponse.status !== 200 || !html.includes("Cambiómetro") || /nonce-|unsafe-inline/.test(csp)) {
  throw new Error(`PAGES_PUBLIC_VERIFY_FAILED:${htmlResponse.status}`);
}

if (!uptimeToken) throw new Error("UPTIME_TOKEN_MISSING");
const apiResponse = await fetch(`${publicUrl}/api/v1/health?cutover_probe=${Date.now()}`, {
  headers: { "X-Cambiometro-Uptime-Token": uptimeToken },
  signal: AbortSignal.timeout(20_000),
});
const apiPayload = await apiResponse.json().catch(() => ({}));
if (apiResponse.status !== 200 || apiPayload?.data?.ok !== true) {
  throw new Error(`WORKER_PUBLIC_VERIFY_FAILED:${apiResponse.status}`);
}

console.log(JSON.stringify({
  action: "cutover-verified",
  htmlStatus: htmlResponse.status,
  apiStatus: apiResponse.status,
  transferSource: apiPayload.data.transferSource ?? null,
  transferRows: apiPayload.data.transferRows ?? null,
}, null, 2));
