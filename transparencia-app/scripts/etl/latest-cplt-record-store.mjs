import { DatabaseSync } from "node:sqlite";
import { rmSync } from "node:fs";

export class LatestCpltRecordStore {
  constructor(filePath) {
    this.filePath = filePath;
    // El archivo usa el PID como parte del nombre, pero una ejecución
    // abortada puede dejarlo atrás. El comportamiento debe ser equivalente al
    // antiguo `openSync(..., "w+")`: cada corrida empieza desde cero.
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      rmSync(`${filePath}${suffix}`, { force: true });
    }
    // El padrón CPLT puede superar el millón de filas y varias centenas de
    // miles de identidades vigentes. Mantener el índice en un Map hace que
    // Node llegue a varios GB de heap antes de poder publicar. SQLite es
    // temporal, local al runner y permite deduplicar sin cargar el universo
    // en memoria.
    this.database = new DatabaseSync(filePath);
    this.database.exec(`
      PRAGMA journal_mode = DELETE;
      PRAGMA synchronous = OFF;
      PRAGMA temp_store = FILE;
      PRAGMA cache_size = -65536;
      CREATE TABLE IF NOT EXISTS cplt_latest (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT NOT NULL UNIQUE,
        period TEXT NOT NULL,
        record_json TEXT NOT NULL,
        organismo_id TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS cplt_latest_record_id ON cplt_latest(record_id);
      CREATE INDEX IF NOT EXISTS cplt_latest_organismo ON cplt_latest(organismo_id, record_id);
    `);
    this.upsertStatement = this.database.prepare(`
      INSERT INTO cplt_latest (record_id, period, record_json, organismo_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(record_id) DO UPDATE SET
        period = excluded.period,
        record_json = excluded.record_json,
        organismo_id = excluded.organismo_id
      WHERE excluded.period > cplt_latest.period
    `);
    this.countStatement = this.database.prepare("SELECT COUNT(*) AS count FROM cplt_latest");
    this.valuesStatement = this.database.prepare("SELECT period, record_json, organismo_id FROM cplt_latest ORDER BY sequence");
    this.sortedStatement = this.database.prepare("SELECT period, record_json, organismo_id FROM cplt_latest ORDER BY record_id");
    this.groupedStatement = this.database.prepare("SELECT period, record_json, organismo_id FROM cplt_latest ORDER BY organismo_id, record_id");
    this.transactionOpen = false;
    this.pendingWrites = 0;
    this.closed = false;
  }

  upsert({ stableKey, period, record, organismoId, recordId = record?.id || stableKey }) {
    if (!stableKey || !period || !record || !organismoId) throw new Error("CPLT_STORE_INVALID_RECORD");
    // Los períodos están normalizados como YYYY-MM, por lo que la comparación
    // lexicográfica conserva sólo la fila más reciente sin usar memoria JS.
    if (!this.transactionOpen) {
      this.database.exec("BEGIN");
      this.transactionOpen = true;
    }
    this.upsertStatement.run(recordId, period, JSON.stringify(record), organismoId);
    this.pendingWrites += 1;
    if (this.pendingWrites >= 10_000) this.flush();
  }

  flush() {
    if (!this.transactionOpen) return;
    this.database.exec("COMMIT");
    this.transactionOpen = false;
    this.pendingWrites = 0;
  }

  get size() {
    return Number(this.countStatement.get().count);
  }

  *values() {
    for (const row of this.valuesStatement.iterate()) {
      yield {
        period: row.period,
        record: JSON.parse(row.record_json),
        organismoId: row.organismo_id,
      };
    }
  }

  *valuesSortedByRecordId() {
    for (const row of this.sortedStatement.iterate()) {
      yield {
        period: row.period,
        record: JSON.parse(row.record_json),
        organismoId: row.organismo_id,
      };
    }
  }

  *groupsByOrganismo() {
    let currentOrganismoId = null;
    let records = [];
    for (const row of this.groupedStatement.iterate()) {
      if (currentOrganismoId !== null && row.organismo_id !== currentOrganismoId) {
        yield { organismoId: currentOrganismoId, records };
        records = [];
      }
      currentOrganismoId = row.organismo_id;
      records.push({ period: row.period, record: JSON.parse(row.record_json), organismoId: row.organismo_id });
    }
    if (currentOrganismoId !== null) yield { organismoId: currentOrganismoId, records };
  }

  close() {
    if (this.closed) return;
    if (this.transactionOpen) {
      this.database.exec("ROLLBACK");
      this.transactionOpen = false;
      this.pendingWrites = 0;
    }
    this.database.close();
    this.closed = true;
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      rmSync(`${this.filePath}${suffix}`, { force: true });
    }
  }
}
