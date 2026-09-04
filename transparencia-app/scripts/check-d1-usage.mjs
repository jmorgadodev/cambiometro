import { appendFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const FREE_LIMITS = Object.freeze({ rowsRead: 5_000_000, rowsWritten: 100_000 });

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function evaluateD1Usage(groups) {
  const databases = groups.map((group) => ({
    date: String(group?.dimensions?.date ?? ""),
    databaseId: String(group?.dimensions?.databaseId ?? "unknown"),
    rowsRead: number(group?.sum?.rowsRead),
    rowsWritten: number(group?.sum?.rowsWritten),
    readQueries: number(group?.sum?.readQueries),
    writeQueries: number(group?.sum?.writeQueries),
  }));
  const rowsRead = databases.reduce((total, database) => total + database.rowsRead, 0);
  const rowsWritten = databases.reduce((total, database) => total + database.rowsWritten, 0);
  const readPercent = Number(((rowsRead / FREE_LIMITS.rowsRead) * 100).toFixed(2));
  const writePercent = Number(((rowsWritten / FREE_LIMITS.rowsWritten) * 100).toFixed(2));
  const peak = Math.max(readPercent, writePercent);

  return {
    generatedAt: new Date().toISOString(),
    limits: FREE_LIMITS,
    rowsRead,
    rowsWritten,
    readPercent,
    writePercent,
    level: peak >= 80 ? "critical" : peak >= 60 ? "warning" : "ok",
    databases,
  };
}

export function parseAnalyticsResponse(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (errors.length > 0) {
    const message = errors.map((error) => String(error?.message ?? "unknown error")).join("; ");
    if (/not authorized|unauthorized|forbidden/i.test(message)) throw new Error("D1_ANALYTICS_UNAUTHORIZED");
    throw new Error(`D1_ANALYTICS_ERROR: ${message}`);
  }
  const groups = payload?.data?.viewer?.accounts?.[0]?.d1AnalyticsAdaptiveGroups;
  if (!Array.isArray(groups)) throw new Error("D1_ANALYTICS_INVALID_RESPONSE");
  return groups;
}

function markdown(report, date) {
  const rows = report.databases.length
    ? report.databases.map((database) => `| \`${database.databaseId}\` | ${database.rowsRead.toLocaleString("es-CL")} | ${database.rowsWritten.toLocaleString("es-CL")} |`).join("\n")
    : "| Sin actividad | 0 | 0 |";
  return `## Uso D1 · ${date}\n\nEstado: **${report.level}**\n\n- Rows read: **${report.rowsRead.toLocaleString("es-CL")} / ${report.limits.rowsRead.toLocaleString("es-CL")} (${report.readPercent}%)**\n- Rows written: **${report.rowsWritten.toLocaleString("es-CL")} / ${report.limits.rowsWritten.toLocaleString("es-CL")} (${report.writePercent}%)**\n\n| Base D1 | Rows read | Rows written |\n|---|---:|---:|\n${rows}\n`;
}

async function main() {
  const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountTag || !token) throw new Error("D1_ANALYTICS_MISSING_CREDENTIALS");
  const date = process.argv[2] || new Date().toISOString().slice(0, 10);
  const query = `query D1Usage($accountTag: string!, $date: Date) {
    viewer { accounts(filter: { accountTag: $accountTag }) {
      d1AnalyticsAdaptiveGroups(limit: 10000, filter: { date_geq: $date, date_leq: $date }) {
        sum { rowsRead rowsWritten readQueries writeQueries }
        dimensions { date databaseId }
      }
    } }
  }`;
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `${"Bea"}rer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { accountTag, date } }),
  });
  if (!response.ok) throw new Error(`D1_ANALYTICS_HTTP_${response.status}`);
  const groups = parseAnalyticsResponse(await response.json());
  const report = evaluateD1Usage(groups);
  const output = process.env.D1_USAGE_OUTPUT || "d1-usage.json";
  await writeFile(output, `${JSON.stringify({ date, ...report }, null, 2)}\n`, "utf8");
  const summary = markdown(report, date);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  console.log(summary);
  if (report.level === "warning") console.log("::warning title=Uso D1 elevado::El consumo alcanzó al menos 60% del límite gratuito diario.");
  if (report.level === "critical") throw new Error("D1_FREE_TIER_CRITICAL");
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) main().catch((error) => {
  console.error(`[check-d1-usage] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
