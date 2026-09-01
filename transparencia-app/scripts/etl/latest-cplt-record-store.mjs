import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export class LatestCpltRecordStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.recordFilePath = `${filePath}.records`;
    this.database = new DatabaseSync(filePath);
    this.recordFd = fs.openSync(this.recordFilePath, "w+");
    this.recordOffset = 0;
    this.database.exec(`
      PRAGMA journal_mode = OFF;
      PRAGMA synchronous = OFF;
      PRAGMA temp_store = FILE;
      PRAGMA cache_size = -65536;
      PRAGMA mmap_size = 0;
      CREATE TABLE latest_records (
        stable_key TEXT PRIMARY KEY,
        period TEXT NOT NULL,
        record_offset INTEGER NOT NULL,
        record_length INTEGER NOT NULL,
        organismo_id TEXT NOT NULL,
        record_id TEXT NOT NULL
      ) WITHOUT ROWID;
    `);
    this.upsertStatement = this.database.prepare(`
      INSERT INTO latest_records (stable_key, period, record_offset, record_length, organismo_id, record_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(stable_key) DO UPDATE SET
        period = excluded.period,
        record_offset = excluded.record_offset,
        record_length = excluded.record_length,
        organismo_id = excluded.organismo_id,
        record_id = excluded.record_id
      WHERE excluded.period > latest_records.period
    `);
    this.database.exec("CREATE INDEX latest_records_by_organism ON latest_records (organismo_id, record_id)");
    this.countStatement = this.database.prepare("SELECT COUNT(*) AS total FROM latest_records");
    this.database.exec("BEGIN");
    this.pending = 0;
    this.closed = false;
  }

  upsert({ stableKey, period, record, organismoId, recordId = record?.id || stableKey }) {
    if (!stableKey || !period || !record || !organismoId) throw new Error("CPLT_STORE_INVALID_RECORD");
    // SQLite sólo conserva el índice. El JSON se agrega a un archivo temporal
    // secuencial y se recupera por offset al finalizar, evitando que el
    // binding nativo retenga cientos de miles de BLOBs en el heap de Node.
    const encoded = Buffer.from(`${JSON.stringify(record)}\n`, "utf8");
    let written = 0;
    while (written < encoded.length) written += fs.writeSync(this.recordFd, encoded, written, encoded.length - written, this.recordOffset + written);
    const offset = this.recordOffset;
    this.recordOffset += encoded.length;
    this.upsertStatement.run(stableKey, period, offset, encoded.length - 1, organismoId, recordId);
    this.pending += 1;
    if (this.pending >= 10_000) this.flush();
  }

  flush() {
    if (this.pending === 0) return;
    this.database.exec("COMMIT; BEGIN");
    this.pending = 0;
  }

  get size() {
    return Number(this.countStatement.get().total);
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
    this.flush();
    const statement = this.database.prepare(`
      SELECT period, record_offset AS offset, record_length AS length, organismo_id AS organismoId
      FROM latest_records
      ORDER BY record_id
    `);
    for (const row of statement.iterate()) {
      yield {
        period: row.period,
        record: this.readRecord(Number(row.offset), Number(row.length)),
        organismoId: row.organismoId,
      };
    }
  }

  *groupsByOrganismo() {
    this.flush();
    const statement = this.database.prepare(`
      SELECT period, record_offset AS offset, record_length AS length, organismo_id AS organismoId
      FROM latest_records
      ORDER BY organismo_id, record_id
    `);
    let currentOrganismoId = null;
    let records = [];
    for (const row of statement.iterate()) {
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
    if (this.pending > 0) this.database.exec("COMMIT");
    else this.database.exec("ROLLBACK");
    fs.closeSync(this.recordFd);
    this.database.close();
    this.closed = true;
    fs.rmSync(this.filePath, { force: true });
    fs.rmSync(this.recordFilePath, { force: true });
  }
}
