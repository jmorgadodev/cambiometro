const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const uptimeToken = process.env.UPTIME_TOKEN?.trim();
const zoneName = process.env.CLOUDFLARE_ZONE || "impulsacv.cl";
const hostname = process.env.PAGES_HOSTNAME || "cambiometro.impulsacv.cl";
const apply = process.argv.includes("--apply");
const disableRum = process.argv.includes("--disable-rum");
const expectedConfirmation = "CAMBIOMETRO_CONFIRM_CUTOVER";

if (!accountId || !apiToken) throw new Error("CLOUDFLARE_CREDENTIALS_MISSING");
if (apply && process.env.CAMBIOMETRO_CONFIRM_CUTOVER !== expectedConfirmation) {
  throw new Error("CLOUDFLARE_APPLY_CONFIRMATION_MISSING");
}
if (disableRum && !apply) throw new Error("DISABLE_RUM_REQUIRES_APPLY");

const apiBase = "https://api.cloudflare.com/client/v4";
async function cf(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success !== true) {
    const details = (body.errors || []).map((error) => error.message).join("; ");
    throw new Error(`CLOUDFLARE_API_FAILED:${response.status}:${details || path}`);
  }
  return body.result;
}

const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=50`);
const zone = zones.find((candidate) => candidate.name === zoneName);
if (!zone?.id) throw new Error(`CLOUDFLARE_ZONE_NOT_FOUND:${zoneName}`);

const rulesets = await cf(`/zones/${zone.id}/rulesets`);
const entryPoint = rulesets.find((ruleset) => ruleset.phase === "http_request_firewall_custom");
if (!entryPoint?.id) throw new Error("WAF_ENTRYPOINT_RULESET_NOT_FOUND");
const detail = await cf(`/zones/${zone.id}/rulesets/${entryPoint.id}`);
const rules = Array.isArray(detail.rules) ? detail.rules : [];
const ruleId = process.env.CF_WAF_RULE_ID?.trim();
const rule = (ruleId ? rules.find((candidate) => candidate.id === ruleId) : null)
  || rules.find((candidate) => /cambiometro|uptime/i.test(`${candidate.description || ""} ${candidate.expression || ""}`));
if (!rule?.id) throw new Error("WAF_UPTIME_RULE_NOT_FOUND: define CF_WAF_RULE_ID or create the named rule first");

if (!uptimeToken) throw new Error("UPTIME_TOKEN_MISSING");
const expression = `(http.host eq "${hostname}" and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/api/")) and http.request.headers["x-cambiometro-uptime-token"][0] eq "${uptimeToken.replaceAll('\\', "\\\\").replaceAll('"', '\\"')}")`;
const publicRule = {
  id: rule.id,
  description: rule.description || "Cambiometro uptime limited access",
  action: rule.action,
  enabled: rule.enabled,
  expression: rule.expression,
  action_parameters: rule.action_parameters,
};
const ruleSummary = rules.map((candidate) => ({
  id: candidate.id,
  description: candidate.description || "",
  action: candidate.action,
  enabled: candidate.enabled,
}));
console.log(JSON.stringify({ mode: apply ? "apply" : "preflight", zone: zoneName, hostname, rule: publicRule, ruleSummary, desired: { expression: expression.replace(uptimeToken, "<secret>") }, expressionMatchesSecret: rule.expression === expression }, null, 2));

if (apply) {
  await cf(`/zones/${zone.id}/rulesets/${entryPoint.id}/rules/${rule.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "skip",
      action_parameters: { phases: ["http_request_firewall_managed", "http_request_sbfm"], products: ["bic", "hot", "securityLevel", "waf"] },
      expression,
      description: rule.description || "Cambiometro uptime limited access",
      enabled: true,
    }),
  });
  console.log(JSON.stringify({ action: "waf-rule-updated", ruleId: rule.id, scope: `${hostname} / and /api/*`, token: "secret-not-printed" }));
}

if (disableRum) {
  const rumSiteId = process.env.CF_RUM_SITE_ID?.trim();
  if (!rumSiteId) throw new Error("CF_RUM_SITE_ID_MISSING_FOR_DISABLE_RUM");
  await cf(`/accounts/${accountId}/rum/site_info/${rumSiteId}`, {
    method: "PUT",
    body: JSON.stringify({ auto_install: false, enabled: false, zone_tag: zone.id }),
  });
  console.log(JSON.stringify({ action: "rum-disabled", siteId: rumSiteId }));
}

const publicUrl = `https://${hostname}`;
for (const path of ["/", "/politico", "/partidos", "/cruces"]) {
  const response = await fetch(`${publicUrl}${path}?cf_guard_probe=${Date.now()}`, {
    headers: { "User-Agent": "Cambiometro-CloudflareGuard/1.0", "X-Cambiometro-Uptime-Token": uptimeToken },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  const csp = response.headers.get("content-security-policy") || "";
  console.log(JSON.stringify({
    probe: path,
    status: response.status,
    headers: {
      "cf-mitigated": response.headers.get("cf-mitigated"),
      "cf-ray": response.headers.get("cf-ray"),
      server: response.headers.get("server"),
      "cf-cache-status": response.headers.get("cf-cache-status"),
      "content-type": response.headers.get("content-type"),
    },
    bodyMarkers: {
      error1020: /error 1020|error code:\s*1020/i.test(text),
      challengePlatform: /cdn-cgi\/challenge-platform/i.test(text),
    },
  }, null, 2));
  if (response.status >= 500 || /error code:\s*1102|worker threw exception/i.test(text)) throw new Error(`PUBLIC_EDGE_FAILED:${path}:${response.status}`);
  if (/unsafe-inline|unsafe-eval|nonce-/i.test(csp)) throw new Error(`CSP_WEAK_OR_DYNAMIC:${path}`);
  console.log(JSON.stringify({ path, status: response.status, cspStatic: true, bytes: text.length }));
}
