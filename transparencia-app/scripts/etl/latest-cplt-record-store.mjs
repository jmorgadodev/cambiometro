import fs from "node:fs";

export class LatestCpltRecordStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.recordFilePath = `${filePath}.records`;
    this.recordFd = fs.openSync(this.recordFilePath, "w+");
    this.index = new Map();
    this.recordOffset = 0;
    this.closed = false;
  }

  upsert({ stableKey, period, record, organismoId, recordId = record?.id || stableKey }) {
    if (!stableKey || !period || !record || !organismoId) throw new Error("CPLT_STORE_INVALID_RECORD");
    const current = this.index.get(stableKey);
    // Los períodos se comparan lexicográficamente en formato YYYY-MM. Si el
    // registro ya publicado es igual o más reciente no hay que serializarlo.
    if (current && period <= current.period) return;

    const encoded = Buffer.from(`${JSON.stringify(record)}\n`, "utf8");
    let written = 0;
    while (written < encoded.length) {
      written += fs.writeSync(
        this.recordFd,
        encoded,
        written,
        encoded.length - written,
        this.recordOffset + written,
      );
    }
    const offset = this.recordOffset;
    this.recordOffset += encoded.length;
    this.index.set(stableKey, {
      period,
      offset,
      length: encoded.length - 1,
      organismoId,
      recordId,
    });
  }

  get size() {
    return this.index.size;
  }

  readRecord(offset, length) {
    const buffer = Buffer.allocUnsafe(length);
    let read = 0;
    while (read < length) {
      const chunk = fs.readSync(this.recordFd, buffer, read, length - read, offset + read);
      if (chunk === 0) throw new Error("CPLT_STORE_RECORD_TRUNCATED");
      read += chunk;
    }
    return JSON.parse(buffer.toString("utf8"));
  }

  *values() {
    for (const row of this.index.values()) {
      yield {
        period: row.period,
        record: this.readRecord(Number(row.offset), Number(row.length)),
        organismoId: row.organismoId,
      };
    }
  }

  *valuesSortedByRecordId() {
    const entries = [...this.index.values()].sort((left, right) => left.recordId.localeCompare(right.recordId));
    for (const row of entries) {
      yield {
        period: row.period,
        record: this.readRecord(Number(row.offset), Number(row.length)),
        organismoId: row.organismoId,
      };
    }
  }

  *groupsByOrganismo() {
    const entries = [...this.index.values()].sort((left, right) => {
      const organismOrder = left.organismoId.localeCompare(right.organismoId);
      return organismOrder || left.recordId.localeCompare(right.recordId);
    });
    let currentOrganismoId = null;
    let records = [];
    for (const row of entries) {
      if (currentOrganismoId !== null && row.organismoId !== currentOrganismoId) {
        yield { organismoId: currentOrganismoId, records };
        records = [];
      }
      currentOrganismoId = row.organismoId;
      records.push({ period: row.period, record: this.readRecord(Number(row.offset), Number(row.length)), organismoId: row.organismoId });
    }
    if (currentOrganismoId !== null) yield { organismoId: currentOrganismoId, records };
  }

  close() {
    if (this.closed) return;
    fs.closeSync(this.recordFd);
    this.closed = true;
    fs.rmSync(this.filePath, { force: true });
    fs.rmSync(this.recordFilePath, { force: true });
  }
}
