import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { finished } from "node:stream/promises";
import { once } from "node:events";
import { join } from "node:path";

async function writeChunk(stream, chunk) {
  if (!stream.write(chunk)) await once(stream, "drain");
}

class JsonArrayWriter {
  constructor(filePath) {
    this.stream = createWriteStream(filePath, { encoding: "utf8" });
    this.first = true;
    this.count = 0;
  }

  async write(record) {
    const prefix = this.first ? "[\n" : ",\n";
    await writeChunk(this.stream, `${prefix}${JSON.stringify(record)}`);
    this.first = false;
    this.count += 1;
  }

  async close() {
    await writeChunk(this.stream, "\n]\n");
    this.stream.end();
    await finished(this.stream);
  }
}

async function fileMetadata(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  const { size } = await stat(filePath);
  return { size, checksumSha256: hash.digest("hex") };
}

export async function writeCentralHonorariosPartitions(records, outputRoot, { sourceUrl = null, sourceValidator = null, generatedAt = new Date().toISOString() } = {}) {
  if (!records || typeof records[Symbol.iterator] !== "function") throw new Error("CENTRAL_HONORARIO_RECORDS_REQUIRED");
  if (!outputRoot) throw new Error("CENTRAL_HONORARIO_OUTPUT_REQUIRED");
  const partitionsRoot = join(outputRoot, "partitions");
  await mkdir(partitionsRoot, { recursive: true });
  const writers = new Map();
  try {
    for (const record of records) {
      const period = String(record?.fuente_periodo ?? "");
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("CENTRAL_HONORARIO_PERIOD_INVALID");
      let writer = writers.get(period);
      if (!writer) {
        writer = new JsonArrayWriter(join(partitionsRoot, `${period}.json`));
        writers.set(period, writer);
      }
      await writer.write(record);
    }
    for (const writer of writers.values()) await writer.close();
  } catch (error) {
    for (const writer of writers.values()) writer.stream.destroy();
    throw error;
  }

  const partitions = [];
  for (const period of [...writers.keys()].sort()) {
    const fileName = `${period}.json`;
    const filePath = join(partitionsRoot, fileName);
    const metadata = await fileMetadata(filePath);
    partitions.push({ period, key: `partitions/${fileName}`, recordCount: writers.get(period).count, ...metadata });
  }
  return {
    schemaVersion: 1,
    dataset: "cplt-central-honorarios-v1",
    sourceUrl,
    sourceValidator,
    generatedAt,
    recordCount: partitions.reduce((total, partition) => total + partition.recordCount, 0),
    partitions,
  };
}
