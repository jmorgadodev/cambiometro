import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export class LatestCpltRecordStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.database = new DatabaseSync(filePath);
    this.database.exec(`
      PRAGMA journal_mode = OFF;
      PRAGMA synchronous = OFF;
      PRAGMA temp_store = FILE;
      PRAGMA cache_size = -65536;
      PRAGMA mmap_size = 0;
      CREATE TABLE latest_records (
        stable_key TEXT PRIMARY KEY,
        period TEXT NOT NULL,
        record_json TEXT NOT NULL,
        organismo_id TEXT NOT NULL
      ) WITHOUT ROWID;
    `);
    this.upsertStatement = this.database.prepare(`
      INSERT INTO latest_records (stable_key, period, record_json, organismo_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(stable_key) DO UPDATE SET
        period = excluded.period,
        record_json = excluded.record_json,
        organismo_id = excluded.organismo_id
      WHERE excluded.period > latest_records.period
    `);
    this.countStatement = this.database.prepare("SELECT COUNT(*) AS total FROM latest_records");
    this.database.exec("BEGIN");
    this.pending = 0;
    this.closed = false;
  }

  upsert({ stableKey, period, record, organismoId }) {
    if (!stableKey || !period || !record || !organismoId) throw new Error("CPLT_STORE_INVALID_RECORD");
    this.upsertStatement.run(stableKey, period, JSON.stringify(record), organismoId);
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

  *values() {
    this.flush();
    const statement = this.database.prepare(`
      SELECT period, record_json, organismo_id AS organismoId
      FROM latest_records
      ORDER BY stable_key
    `);
    for (const row of statement.iterate()) {
      yield {
        period: row.period,
        record: JSON.parse(row.record_json),
        organismoId: row.organismoId,
      };
    }
  }

  close() {
    if (this.closed) return;
    if (this.pending > 0) this.database.exec("COMMIT");
    else this.database.exec("ROLLBACK");
    this.database.close();
    this.closed = true;
    fs.rmSync(this.filePath, { force: true });
  }
}
