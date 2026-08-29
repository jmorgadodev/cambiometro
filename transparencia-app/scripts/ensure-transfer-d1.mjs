import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const databaseName = argument("--name", "cambiometro-transferencias");
const output = resolve(
  root,
  argument("--output", "wrangler.transfer-d1.generated.jsonc"),
);
const baseConfig = argument(
  "--base-config",
  "workers/public-api/wrangler.jsonc",
);
const mode = process.argv.includes("--worker-config") ? "worker" : "d1";
const createIfMissing = process.argv.includes("--create");

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`TRANSFER_D1_MISSING_${name}`);
  return value;
}

async function cloudflare(path, init = {}) {
  const accountId = required("CLOUDFLARE_ACCOUNT_ID");
  const token = (
    process.env.CLOUDFLARE_DATA_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    ""
  ).trim();
  if (!token) throw new Error("TRANSFER_D1_MISSING_CLOUDFLARE_API_TOKEN");
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    const detail = Array.isArray(body?.errors)
      ? body.errors.map((error) => error.message).join("; ")
      : `HTTP ${response.status}`;
    throw new Error(`TRANSFER_D1_CLOUDFLARE_API_FAILED: ${detail}`);
  }
  return body.result;
}

function databaseId(value) {
  return value?.uuid ?? value?.database_id ?? value?.id ?? null;
}

async function resolveDatabase() {
  const query = `?name=${encodeURIComponent(databaseName)}&per_page=100`;
  const listed = await cloudflare(query);
  const existing = (Array.isArray(listed) ? listed : []).find(
    (item) => item?.name === databaseName,
  );
  if (databaseId(existing)) return databaseId(existing);
  if (!createIfMissing)
    throw new Error(`TRANSFER_D1_NOT_FOUND: ${databaseName}`);

  try {
    const created = await cloudflare("", {
      method: "POST",
      body: JSON.stringify({ name: databaseName }),
    });
    const id = databaseId(created);
    if (!id) throw new Error("TRANSFER_D1_CREATE_RESPONSE_MISSING_UUID");
    return id;
  } catch (error) {
    // A concurrent ETL/Worker run may have created the same database. Resolve
    // it once more before failing, keeping setup idempotent.
    const retry = await cloudflare(query);
    const concurrent = (Array.isArray(retry) ? retry : []).find(
      (item) => item?.name === databaseName,
    );
    if (databaseId(concurrent)) return databaseId(concurrent);
    throw error;
  }
}

function transferBinding(id) {
  return {
    binding: "TRANSFERS_DB",
    database_name: databaseName,
    database_id: id,
  };
}

function writeConfig(id) {
  if (mode === "d1") {
    writeFileSync(
      output,
      `${JSON.stringify(
        {
          $schema: "./node_modules/wrangler/config-schema.json",
          name: "cambiometro-transfer-d1",
          d1_databases: [
            {
              binding: "DB",
              database_name: databaseName,
              database_id: id,
              migrations_dir: resolve(root, "migrations-transferencias"),
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    return;
  }

  const config = JSON.parse(readFileSync(resolve(root, baseConfig), "utf8"));
  config.d1_databases = [
    ...(config.d1_databases ?? []).filter(
      (binding) => binding.binding !== "TRANSFERS_DB",
    ),
    transferBinding(id),
  ];
  if (config.env?.preview) {
    config.env.preview.d1_databases = [
      ...(config.env.preview.d1_databases ?? []).filter(
        (binding) => binding.binding !== "TRANSFERS_DB",
      ),
      transferBinding(id),
    ];
  }
  writeFileSync(output, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

const id = await resolveDatabase();
writeConfig(id);
console.log(
  JSON.stringify({ databaseName, databaseId: id, mode, output }, null, 2),
);
