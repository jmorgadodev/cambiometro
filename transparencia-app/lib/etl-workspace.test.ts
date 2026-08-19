import { describe, expect, it } from "vitest";
import { requiredProjectionKeys } from "../scripts/prepare-etl-workspace.mjs";

describe("workspace ETL limpio", () => {
  it("recupera sólo los índices de entidades requeridos por la fuente", () => {
    const catalog = { sources: [
      { id: "dipres", entityKey: "entities/v1/dipres.jsonl.gz", entityIndexKey: "indexes/v1/dipres/entities.jsonl.gz" },
      { id: "servel", entityKey: "entities/v1/servel.jsonl.gz", entityIndexKey: "indexes/v1/servel/entities.jsonl.gz" },
    ] };
    expect(requiredProjectionKeys(catalog, ["dipres"])).toEqual([
      "entities/v1/dipres.jsonl.gz",
      "indexes/v1/dipres/entities.jsonl.gz",
    ]);
  });
});
