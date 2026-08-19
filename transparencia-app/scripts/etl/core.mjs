import { createHash, createHmac } from "node:crypto";
import { Readable } from "node:stream";
import { createGzip, gzipSync } from "node:zlib";

const PERSONAL_KEYS = new Set([
  "domicilio", "direccion",
  "domicilio_particular", "direccion_particular", "cuenta_bancaria", "numero_cuenta",
  "firma", "placa_patente", "datos_parientes",
]);

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildDeterministicPartition(records) {
  const ordered = [...records].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const jsonl = `${ordered.map(stableStringify).join("\n")}\n`;
  const compressed = gzipSync(Buffer.from(jsonl, "utf8"), { level: 9, mtime: 0 });
  return {
    records: ordered,
    compressed,
    checksumSha256: createHash("sha256").update(compressed).digest("hex"),
    uncompressedChecksumSha256: createHash("sha256").update(jsonl).digest("hex"),
  };
}

export async function gzipDeterministicJsonl(records, compare = (a, b) => stableStringify(a).localeCompare(stableStringify(b))) {
  const ordered = [...records].sort(compare);
  const uncompressedHash = createHash("sha256");
  async function* lines() {
    for (const record of ordered) {
      const line = `${stableStringify(record)}\n`;
      uncompressedHash.update(line);
      yield line;
    }
  }
  const chunks = [];
  for await (const chunk of Readable.from(lines()).pipe(createGzip({ level: 9, mtime: 0 }))) chunks.push(chunk);
  const compressed = Buffer.concat(chunks);
  return {
    compressed,
    checksumSha256: createHash("sha256").update(compressed).digest("hex"),
    uncompressedChecksumSha256: uncompressedHash.digest("hex"),
  };
}

export function splitDeterministically(input, maxPartBytes = 1_900_000_000) {
  if (!Number.isSafeInteger(maxPartBytes) || maxPartBytes < 1) throw new Error("INVALID_PART_SIZE");
  const parts = [];
  for (let offset = 0; offset < input.length; offset += maxPartBytes) {
    parts.push(input.subarray(offset, Math.min(offset + maxPartBytes, input.length)));
  }
  return parts;
}

export function sanitizeForPublication(value, key = "") {
  const normalizedKey = key.toLocaleLowerCase("es-CL");
  if (PERSONAL_KEYS.has(normalizedKey)) return undefined;
  if (Array.isArray(value)) return value.map((item) => sanitizeForPublication(item)).filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .map(([entryKey, entryValue]) => [entryKey, sanitizeForPublication(entryValue, entryKey)])
      .filter(([, entryValue]) => entryValue !== undefined));
  }
  if (typeof value === "string") return value;
  return value;
}

export function protectPersonalIdentifiers(record, hmacSecret) {
  if (typeof hmacSecret !== "string" || hmacSecret.length < 32) throw new Error("HMAC_SECRET_TOO_SHORT");
  const personalRut = record.rut ?? record.run ?? record.rut_persona ?? record.rut_personal;
  const normalizedRut = typeof personalRut === "string" ? personalRut.replace(/[^0-9kK]/g, "").toUpperCase() : null;
  return {
    internal: {
      personalRutHmac: normalizedRut
        ? createHmac("sha256", hmacSecret).update(normalizedRut).digest("hex")
        : null,
    },
    public: sanitizeForPublication(record),
  };
}

export function storagePolicy(usedGb, limitGb = 8) {
  if (!Number.isFinite(usedGb) || !Number.isFinite(limitGb) || usedGb < 0 || limitGb <= 0) throw new Error("INVALID_STORAGE_USAGE");
  const ratio = usedGb / limitGb;
  if (ratio >= 0.9) return { action: "block_growth", ratio };
  if (ratio >= 0.8) return { action: "archive_cold_partitions", ratio };
  return { action: "publish", ratio };
}

export function applyConnectorOutcome(previous, outcome) {
  if (outcome.error) {
    return {
      records: previous?.records ?? [],
      checksumSha256: previous?.checksumSha256 ?? null,
      status: previous?.records?.length ? "stale" : "unavailable",
      errors: [outcome.error instanceof Error ? outcome.error.message : String(outcome.error)],
    };
  }
  return {
    records: outcome.records ?? [],
    checksumSha256: outcome.checksumSha256 ?? null,
    status: outcome.status ?? "partial",
    errors: [],
  };
}
