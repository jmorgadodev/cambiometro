import { describe, expect, it } from "vitest";
import { changedSources, sourceChecksums } from "./materialize-incremental.mjs";

const sources = [{ id: "votaciones_senado" }, { id: "camara" }];
const partitions = [
  { id: "senado-2026-08", sourceId: "votaciones_senado", checksumSha256: "senado-checksum", recordCount: 2 },
  { id: "camara-2026-08", sourceId: "camara", checksumSha256: "camara-checksum", recordCount: 2 },
];

describe("materialización incremental D1", () => {
  it("calcula checksums estables por fuente", () => {
    expect(sourceChecksums(sources, partitions).get("votaciones_senado")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("no materializa una fuente cuyo checksum ya está publicado", () => {
    const checksums = sourceChecksums(sources, partitions);
    const previous = new Map([...checksums].map(([id, checksum_sha256]) => [id, { checksum_sha256 }]));
    expect(changedSources(sources, partitions, previous)).toEqual([]);
  });

  it("mantiene pendientes las fuentes nuevas o modificadas", () => {
    const checksums = sourceChecksums(sources, partitions);
    const previous = new Map([
      ["votaciones_senado", { checksum_sha256: checksums.get("votaciones_senado") }],
      ["camara", { checksum_sha256: "old-checksum" }],
    ]);
    expect(changedSources(sources, partitions, previous).map((source) => source.id)).toEqual(["camara"]);
  });
});

