import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..", "..");
const read = (relativePath) => readFileSync(join(repoRoot, relativePath), "utf8");
const pagesRefresh = read(".github/workflows/pages-static-refresh.yml");
const worker = read(".github/workflows/public-api-worker.yml");
const domain = read(".github/workflows/pages-domain-cutover.yml");
const cloudflare = read("transparencia-app/scripts/cloudflare-production-guard.mjs");
const freshness = read("transparencia-app/scripts/verify-etl-freshness.mjs");
const movementsWorkflow = read(".github/workflows/etl-movimientos.yml");
const failures = [];

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(`${label}: falta ${text}`);
}

requireText(pagesRefresh, "inputs.confirm_cutover == 'CAMBIOMETRO_CONFIRM_CUTOVER'", "Pages production publish gate");
requireText(pagesRefresh, "github.event_name == 'workflow_dispatch' && inputs.publish_pages == true", "Pages manual dispatch gate");
requireText(pagesRefresh, "github.event_name == 'workflow_run' && github.event.workflow_run.conclusion == 'success'", "ETL Pages automatic publication gate");
requireText(freshness, "STATIC_RELEASE_WAIT_MS", "ETL freshness wait configuration");
requireText(movementsWorkflow, "NODE_USE_SYSTEM_CA: \"1\"", "Movimientos TLS system CA configuration");
requireText(worker, "CAMBIOMETRO_CONFIRM_CUTOVER: ${{ inputs.confirmation }}", "Worker promotion confirmation input");
requireText(worker, 'test "$CAMBIOMETRO_CONFIRM_CUTOVER" = "CAMBIOMETRO_CONFIRM_CUTOVER"', "Worker promotion confirmation check");
requireText(domain, 'test -n "$UPTIME_TOKEN"', "DNS cutover uptime token check");
requireText(cloudflare, 'process.env.CAMBIOMETRO_CONFIRM_CUTOVER !== expectedConfirmation', "Cloudflare apply confirmation check");
requireText(cloudflare, 'http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/api/")', "Cloudflare path scope");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Production gate guard passed: Pages, Worker, DNS and WAF require explicit confirmation and scoped tokens.");
